import type {
  Challenge,
  ChallengeParticipant,
  ChallengeStatus,
  PublicProfile,
} from "@/lib/supabase/database.types";
import { deleteRow, getSupabase, requireUserId, unwrap } from "../shared/api";

/**
 * Challenges.
 *
 * Everything that changes a challenge goes through a database function rather
 * than a table write. That is not ceremony: creating a challenge writes three
 * rows across two tables and has to be all-or-nothing; answering an invitation
 * is only legal for the invited person while it is still pending; and recording
 * a result must be impossible to aim at somebody else's row. Those are rules
 * about *who may do what*, and rules like that do not belong in a client that
 * anybody can open the developer tools on.
 *
 * Reads stay ordinary table queries, because RLS already answers "may I see
 * this?" on its own.
 */

export interface ChallengeView {
  challenge: Challenge;
  /** Both rows — yours and theirs. */
  participants: ChallengeParticipant[];
  me: ChallengeParticipant | undefined;
  them: ChallengeParticipant | undefined;
  opponent: PublicProfile | undefined;
  /** True when you are the one who sent the invitation. */
  isCreator: boolean;
}

/** Challenges you are part of, newest first, with both scoreboards attached. */
export async function listChallenges(): Promise<ChallengeView[]> {
  const supabase = getSupabase();
  const userId = await requireUserId();

  const challenges = unwrap(
    await supabase.from("challenges").select("*").order("created_at", { ascending: false }),
  );
  if (challenges.length === 0) return [];

  const [participants, profiles] = await Promise.all([
    supabase
      .from("challenge_participants")
      .select("*")
      .in(
        "challenge_id",
        challenges.map((challenge) => challenge.id),
      ),
    // The narrow, function-guarded view of the people involved — never a
    // `profiles` select, which would return programme, term and the rest.
    supabase.rpc("challenge_profiles"),
  ]);

  const rows = unwrap(participants);
  const people = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));

  const byChallenge = new Map<string, ChallengeParticipant[]>();
  for (const row of rows) {
    const list = byChallenge.get(row.challenge_id) ?? [];
    list.push(row);
    byChallenge.set(row.challenge_id, list);
  }

  return challenges.map((challenge) => {
    const list = byChallenge.get(challenge.id) ?? [];
    const isCreator = challenge.creator_id === userId;
    const opponentId = isCreator ? challenge.opponent_id : challenge.creator_id;

    return {
      challenge,
      participants: list,
      me: list.find((row) => row.user_id === userId),
      them: list.find((row) => row.user_id !== userId),
      opponent: people.get(opponentId),
      isCreator,
    };
  });
}

/** Invitations waiting on you. Drives the dashboard card and the nav badge. */
export async function countPendingInvitations(): Promise<number> {
  const userId = await requireUserId();
  const { count, error } = await getSupabase()
    .from("challenges")
    .select("id", { count: "exact", head: true })
    .eq("opponent_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Username search, through the function that decides what may be returned. */
export async function searchUsers(query: string): Promise<PublicProfile[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const { data, error } = await getSupabase().rpc("search_profiles", { query: trimmed });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createChallenge(input: {
  quizId: string;
  opponentUsername: string;
  title: string;
}): Promise<string> {
  const { data, error } = await getSupabase().rpc("create_challenge", {
    quiz: input.quizId,
    opponent_username: input.opponentUsername.trim().toLowerCase(),
    challenge_title: input.title.trim(),
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function respondToChallenge(
  challengeId: string,
  accept: boolean,
): Promise<ChallengeStatus> {
  const { data, error } = await getSupabase().rpc("respond_to_challenge", {
    challenge: challengeId,
    accept,
  });
  if (error) throw new Error(error.message);
  return data as ChallengeStatus;
}

export async function submitChallengeResult(input: {
  challengeId: string;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
}): Promise<ChallengeStatus> {
  const { data, error } = await getSupabase().rpc("submit_challenge_result", {
    challenge: input.challengeId,
    final_score: input.score,
    question_count: input.totalQuestions,
    seconds_taken: input.durationSeconds,
  });
  if (error) throw new Error(error.message);
  return data as ChallengeStatus;
}

/** Only the creator can call one off; the policy enforces that too. */
export async function cancelChallenge(id: string): Promise<void> {
  await deleteRow("challenges", id);
}

/** Who won, once both sides are in. */
export type ChallengeVerdict = "won" | "lost" | "draw" | "unfinished";

export function verdictOf(view: ChallengeView): ChallengeVerdict {
  const mine = view.me;
  const theirs = view.them;
  if (!mine?.completed_at || !theirs?.completed_at) return "unfinished";

  const myScore = mine.score ?? 0;
  const theirScore = theirs.score ?? 0;
  if (myScore > theirScore) return "won";
  if (myScore < theirScore) return "lost";

  // Same score: the faster finish takes it, which is the only tiebreak both
  // players can see and neither can fake without also being quicker.
  const mySeconds = mine.duration_seconds ?? Number.MAX_SAFE_INTEGER;
  const theirSeconds = theirs.duration_seconds ?? Number.MAX_SAFE_INTEGER;
  if (mySeconds < theirSeconds) return "won";
  if (mySeconds > theirSeconds) return "lost";
  return "draw";
}

/** Percentage for a participant, or null when they have not finished. */
export function percentageOf(participant: ChallengeParticipant | undefined): number | null {
  if (!participant?.completed_at || !participant.total_questions) return null;
  return Math.round(((participant.score ?? 0) / participant.total_questions) * 100);
}
