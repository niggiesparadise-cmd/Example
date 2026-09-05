"use client";

import { Description, FieldError, Input, Label, TextArea, TextField } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

interface FieldProps extends Omit<ComponentProps<typeof TextField>, "children"> {
  label: string;
  /** Rendered under the control when there is no error to show. */
  hint?: ReactNode;
  placeholder?: string;
  type?: "text" | "email" | "password" | "date" | "time" | "number" | "url";
  /** Validation message. Present means the field is invalid. */
  errorMessage?: string;
}

/**
 * A labelled text input wired to React Aria's validation.
 *
 * Passing `errorMessage` marks the field invalid, which HeroUI reflects in the
 * styling and React Aria announces — so the message reaches a screen reader
 * rather than only being visible.
 */
export function TextInputField({ errorMessage, hint, label, placeholder, type = "text", ...props }: FieldProps) {
  return (
    <TextField {...props} isInvalid={Boolean(errorMessage) || props.isInvalid} validationBehavior="aria">
      <Label isRequired={props.isRequired}>{label}</Label>
      <Input placeholder={placeholder} type={type} />
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : hint ? <Description>{hint}</Description> : null}
    </TextField>
  );
}

interface AreaProps extends Omit<ComponentProps<typeof TextField>, "children"> {
  label: string;
  hint?: ReactNode;
  placeholder?: string;
  rows?: number;
  errorMessage?: string;
}

/** The multi-line counterpart, for note bodies and free-text fields. */
export function TextAreaField({ errorMessage, hint, label, placeholder, rows = 4, ...props }: AreaProps) {
  return (
    <TextField {...props} isInvalid={Boolean(errorMessage) || props.isInvalid} validationBehavior="aria">
      <Label isRequired={props.isRequired}>{label}</Label>
      <TextArea placeholder={placeholder} rows={rows} />
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : hint ? <Description>{hint}</Description> : null}
    </TextField>
  );
}
