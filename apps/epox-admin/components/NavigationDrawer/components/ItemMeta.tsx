import styles from '../NavigationDrawer.module.scss';

interface ItemMetaProps {
  children: React.ReactNode;
}

export function ItemMeta({ children }: ItemMetaProps) {
  return <div className={styles.itemMeta}>{children}</div>;
}
