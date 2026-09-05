"use client";

import { Alert, Button, Modal } from "@heroui/react";
import type { ReactNode } from "react";

/**
 * The shell every create/edit form uses.
 *
 * Detail and edit views are dialogs rather than routes on purpose: the app is a
 * static export, so `/courses/[id]` would need `generateStaticParams`, which
 * cannot enumerate a user's rows at build time. A dialog keeps deep-linking out
 * of the problem entirely.
 */
export function FormDialog({
  children,
  error,
  isOpen,
  isPending,
  onOpenChange,
  onSubmit,
  submitLabel,
  title,
}: {
  children: ReactNode;
  error?: Error;
  isOpen: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  submitLabel: string;
  title: string;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-4">
              {error ? (
                <Alert status="danger">
                  <Alert.Content>
                    <Alert.Description>{error.message}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
              {children}
            </Modal.Body>

            <Modal.Footer className="gap-2">
              {/* Cancel always discards and closes — no silent partial saves. */}
              <Button isDisabled={isPending} onPress={() => onOpenChange(false)} variant="tertiary">
                Cancel
              </Button>
              <Button isDisabled={isPending} type="submit" variant="primary">
                {isPending ? "Saving…" : submitLabel}
              </Button>
            </Modal.Footer>
          </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/** Destructive confirmation. Deletes are never one tap away from data loss. */
export function ConfirmDeleteDialog({
  description,
  isOpen,
  isPending,
  onConfirm,
  onOpenChange,
  title,
}: {
  description: string;
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-muted">{description}</p>
          </Modal.Body>
          <Modal.Footer className="gap-2">
            <Button isDisabled={isPending} onPress={() => onOpenChange(false)} variant="tertiary">
              Cancel
            </Button>
            <Button isDisabled={isPending} onPress={onConfirm} variant="danger">
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
