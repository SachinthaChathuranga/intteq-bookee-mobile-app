import { forwardRef, type ReactNode } from 'react';
import type { TextInput, TextInputProps } from 'react-native';
import { Input } from '../ui/Input';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, leftIcon, rightIcon, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      label={label}
      error={error}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      {...rest}
    />
  );
});
