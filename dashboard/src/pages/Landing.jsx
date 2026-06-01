import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Landing.module.css';
import { BiMoviePlay, BiTv, BiDownload, BiGroup, BiLockAlt, BiGlobe, BiCheck, BiX } from 'react-icons/bi';
import { FaStar } from 'react-icons/fa';
import { MdMovieFilter, MdPeople, MdHd, MdTranslate } from 'react-icons/md';

const STATS = [
  { value: 500, suffix: '+', label: 'Movies & Series', icon: <MdMovieFilter />, desc: 'Growing library' },
  { value: 50,  suffix: 'K+', label: 'Active Viewers',  icon: <MdPeople />,     desc: 'Happy subscribers' },
  { value: 4,   suffix: 'K',  label: 'Ultra HD Quality', icon: <MdHd />,          desc: 'Crystal clear picture' },
  { value: 100, suffix: '%',  label: 'Amharic Dubbed',  icon: <MdTranslate />,   desc: 'Fully localised' },
];

const FEATURES = [
  { icon: <BiMoviePlay />, title: 'Amharic Dubbed', desc: 'Watch Hollywood blockbusters fully dubbed in Amharic — no reading required.' },
  { icon: <BiTv />, title: 'Ultra HD Quality', desc: 'Stream in stunning 4K and 1080p on any screen, any device, anywhere.' },
  { icon: <BiDownload />, title: 'Download Offline', desc: 'Save movies to your device and watch without internet on your commute.' },
  { icon: <BiGroup />, title: 'Family Sharing', desc: 'One subscription shared across 5 screens simultaneously for the whole family.' },
  { icon: <BiLockAlt />, title: 'Safe & Secure', desc: 'Bank-grade encryption and child-safe profiles keep your family protected.' },
  { icon: <BiGlobe />, title: 'Watch Anywhere', desc: 'Smart TV, phone, tablet, or laptop — your library follows you everywhere.' },
];

const PLANS = [
  {
    name: 'Basic', price: 99, features: [
      { text: 'HD quality (720p)', ok: true },
      { text: '1 screen at a time', ok: true },
      { text: 'Amharic subtitles', ok: true },
      { text: 'Amharic dub', ok: false },
      { text: 'Download offline', ok: false },
    ]
  },
  {
    name: 'Popular', price: 199, featured: true, features: [
      { text: 'Full HD (1080p)', ok: true },
      { text: '2 screens at once', ok: true },
      { text: 'Amharic subtitles', ok: true },
      { text: 'Amharic dub', ok: true },
      { text: 'Download offline', ok: true },
    ]
  },
  {
    name: 'Family', price: 349, features: [
      { text: '4K Ultra HD', ok: true },
      { text: '5 screens at once', ok: true },
      { text: 'Amharic subtitles', ok: true },
      { text: 'Amharic dub', ok: true },
      { text: 'Download offline', ok: true },
    ]
  },
];

const REVIEWS = [
  { name: 'Abebe T.', avatar: '👨🏾', text: 'Finally a streaming site where I can watch movies in Amharic with my whole family! The quality is amazing.', stars: 5 },
  { name: 'Tigist M.', avatar: '👩🏾', text: 'My kids love it. They watch everything in Amharic and actually understand the full story now!', stars: 5 },
  { name: 'Dawit K.', avatar: '👨🏾‍💼', text: 'The 4K quality and the Amharic dubbing together is something I never thought I would see. Subscribing forever.', stars: 5 },
];

function AnimatedCounter({ target, suffix }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = target / 60;
        const interval = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(interval); }
          else setCount(Math.floor(start));
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const glowRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (glowRef.current) {
        // Use clientX/Y for viewport-relative tracking (position: fixed)
        glowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleCTA = (e) => {
    e.preventDefault();
    navigate(`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`);
  };

  return (
    <div className={styles.page}>
      {/* ── Cursor Glow ── */}
      <div ref={glowRef} className={styles.cursorGlow} />

      {/* ── Navbar ── */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <img src="https://res.cloudinary.com/dyop5rdpn/image/upload/v1699352390/MT%20Movies/mt_movies_transparent_dark_x5j2m8.png" alt="MTMovies" />
          <span><strong>MT</strong>Movies</span>
        </div>
        <Link to="/login" className={styles.navSignIn}>Sign In</Link>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Ethiopia's #1 Streaming Platform</span>
          <h1 className={styles.heroTitle}>
            Watch Movies & Series<br />
            <span className={styles.heroAccent}>In Amharic</span>
          </h1>
          <p className={styles.heroSub}>
            Unlimited entertainment dubbed and subtitled in Amharic. Cancel anytime.
          </p>
          <form className={styles.heroForm} onSubmit={handleCTA}>
            <input
              type="email"
              placeholder="Enter your email to get started"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={styles.heroInput}
            />
            <button type="submit" className={styles.heroBtn}>
              Get Started <span>›</span>
            </button>
          </form>
          <p className={styles.heroNote}>Free trial available. No credit card required.</p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {STATS.map(s => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statIconWrap}>{s.icon}</div>
              <div className={styles.statNum}>
                <AnimatedCounter target={s.value} suffix={s.suffix} />
              </div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statDesc}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Why MT Movies?</span>
          <h2 className={styles.sectionTitle}>Everything you need to enjoy movies</h2>
        </div>
        <div className={styles.featuresGrid}>
          {FEATURES.map(f => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className={styles.section} id="pricing">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Choose Your Plan</span>
          <h2 className={styles.sectionTitle}>Flexible subscriptions for every budget</h2>
          <p className={styles.sectionSub}>Cancel anytime. No hidden fees.</p>
        </div>
        <div className={styles.plansGrid}>
          {PLANS.map(plan => (
            <div key={plan.name} className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ''}`}>
              {plan.featured && <span className={styles.planBestTag}><FaStar style={{marginRight: '4px', transform: 'translateY(-1px)'}} /> Best Value</span>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.planPrice}>
                <span className={styles.planCurrency}>ETB</span>
                <span className={styles.planAmount}>{plan.price}</span>
                <span className={styles.planPeriod}>/mo</span>
              </div>
              <ul className={styles.planFeatures}>
                {plan.features.map((f, i) => (
                  <li key={i} className={`${styles.planFeatureItem} ${!f.ok ? styles.planFeatureMuted : ''}`}>
                    <span>{f.ok ? <BiCheck /> : <BiX />}</span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className={`${styles.planBtn} ${plan.featured ? styles.planBtnFeatured : ''}`}
              >
                {plan.featured ? 'Subscribe Now' : 'Get Started'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Customer Love</span>
          <h2 className={styles.sectionTitle}>What our viewers say</h2>
        </div>
        <div className={styles.reviewsGrid}>
          {REVIEWS.map((r, i) => (
            <div key={i} className={styles.reviewCard}>
              <div className={styles.reviewStars}>
                {Array(r.stars).fill().map((_, idx) => <FaStar key={idx} />)}
              </div>
              <p className={styles.reviewText}>"{r.text}"</p>
              <div className={styles.reviewer}>
                <span className={styles.reviewerAvatar}>{r.avatar}</span>
                <span className={styles.reviewerName}>{r.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className={styles.footerCta}>
        <h2 className={styles.footerCtaTitle}>Ready to watch?</h2>
        <p className={styles.footerCtaSub}>Create an account and start watching in seconds.</p>
        <Link to="/login" className={styles.footerCtaBtn}>Start Watching Free</Link>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <img src="https://res.cloudinary.com/dyop5rdpn/image/upload/v1699352390/MT%20Movies/mt_movies_transparent_dark_x5j2m8.png" alt="MTMovies" />
          <span><strong>MT</strong>Movies</span>
        </div>
        <p className={styles.footerNote}>MTMovies © {new Date().getFullYear()} — English Movies & Series in Amharic</p>
      </footer>
    </div>
  );
}
