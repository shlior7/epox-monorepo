import styles from '../NavigationDrawer.module.scss';

interface ItemTitleProps {
  children: React.ReactNode;
}

export function ItemTitle({ children }: ItemTitleProps) {
  return <div className={styles.itemTitle}>{children}</div>;
}
