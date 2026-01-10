import clsx from 'clsx';
import { Check } from 'lucide-react';
import styles from '../NavigationDrawer.module.scss';

interface CheckboxProps {
  checked: boolean;
}

export function Checkbox({ checked }: CheckboxProps) {
  return (
    <div className={clsx(styles.checkbox, { [styles.checkboxSelected]: checked })}>
      {checked && <Check size={14} />}
    </div>
  );
}
