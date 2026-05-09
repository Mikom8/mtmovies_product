import styles from './PageSkeleton.module.css';

export default function PageSkeleton() {
  return (
    <div className={styles.page}>
      {/* Hero skeleton */}
      <div className={styles.skeletonHero}>
        <div className={styles.skeletonHeroContent}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonMeta} />
          <div className={styles.skeletonDesc} />
          <div className={styles.skeletonDescShort} />
          <div className={styles.skeletonDescShort} style={{ width: '60%' }} />
          <div className={styles.skeletonBtnRow}>
            <div className={styles.skeletonBtn} />
            <div className={styles.skeletonBtnSm} />
          </div>
        </div>
      </div>

      {/* Rows skeleton */}
      <div className={styles.skeletonContent}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.skeletonSectionTitle} />
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className={styles.skeletonCard}>
                  <div className={styles.skeletonPoster} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
