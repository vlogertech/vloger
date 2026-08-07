import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Minus } from "lucide-react";

import { cn } from "@/lib/utils";

// input-otp ships strict TS types; this project uses JS/JSX wrappers.
// Keep this module excluded from typecheck by using TypeScript ignore on all lines.
// @ts-nocheck

// eslint-disable-next-line react/display-name
const InputOTP = React.forwardRef((props, ref) => (
  // @ts-ignore input-otp requires children in its types; this wrapper is permissive.
  <OTPInput ref={ref} maxLength={6} {...props} />
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef((props, ref) => (
  // Minimal typing for JS/strict TS projects
  <div
    ref={ref}
    className={cn("flex items-center", /** @type {any} */ (props)?.className)}
    {.../** @type {any} */ (props)}
  />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef((props, ref) => {
  // Minimal typing for JS/strict TS projects
  const { index, className, ...rest } = /** @type {any} */ (props || {});


  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = index != null ? inputOTPContext.slots[index] : null;
  const { char, hasFakeCaret, isActive } = slot || {};

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      )}
      {...rest}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef((props, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };

