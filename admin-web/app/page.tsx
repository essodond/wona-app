const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim();
const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim();
const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim();

type DownloadIcon = "download" | "google-play" | "app-store";

type DownloadButtonProps = {
  href?: string;
  eyebrow: string;
  label: string;
  icon: DownloadIcon;
  download?: boolean;
};

function DownloadButton({
  href,
  eyebrow,
  label,
  icon,
  download = false,
}: DownloadButtonProps) {
  const iconContent = {
    download: "↓",
    "google-play": "\uf3ab",
    "app-store": "\uf370",
  }[icon];

  const content = (
    <>
      <span
        className={`download-icon ${icon === "download" ? "" : "store-brand-icon"}`}
        aria-hidden="true"
      >
        {iconContent}
      </span>
      <span>
        <small>{href ? eyebrow : "Bientôt disponible"}</small>
        <strong>{label}</strong>
      </span>
    </>
  );

  if (!href) {
    return (
      <span className="download-button is-disabled" aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <a
      className="download-button"
      href={href}
      target="_blank"
      rel="noreferrer"
      download={download || undefined}
    >
      {content}
    </a>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="#accueil" aria-label="Wona, accueil">
          <span className="landing-brand-mark" aria-hidden="true">
            W
          </span>
          <span>WONA</span>
        </a>

        <nav className="landing-nav" aria-label="Navigation principale">
          <a href="#fonctionnement">Comment ça marche</a>
          <a href="#pour-qui">Pour qui</a>
          <a href="#questions">Questions</a>
        </nav>

        <a className="header-cta" href="#telecharger">
          Télécharger
        </a>
      </header>

      <section className="landing-hero" id="accueil">
        <div className="hero-copy">
          <p className="landing-eyebrow">
            <span /> Livraison de proximité à Lomé
          </p>
          <h1>
            Vos colis.
            <br />
            <em>Notre mission.</em>
          </h1>
          <p className="hero-lead">
            Wona connecte vendeurs et livreurs pour des livraisons plus
            simples, plus rapides et suivies à chaque étape.
          </p>

          <div className="hero-actions">
            <a className="landing-primary" href="#telecharger">
              Obtenir l&apos;application <span aria-hidden="true">↓</span>
            </a>
            <a className="landing-text-link" href="#fonctionnement">
              Découvrir Wona <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="hero-assurance" aria-label="Avantages Wona">
            <div>
              <strong>01</strong>
              <span>Une seule application</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Suivi de vos courses</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Pensé pour le Togo</span>
            </div>
          </div>
        </div>

        <div
          className="hero-visual"
          role="img"
          aria-label="Livreur Wona à moto prêt à effectuer une livraison"
        >
          <div className="hero-location-card">
            <span className="location-pulse" aria-hidden="true" />
            <div>
              <small>Zone de lancement</small>
              <strong>Lomé, Togo</strong>
            </div>
          </div>
          <div className="hero-status-card">
            <span aria-hidden="true">✓</span>
            <div>
              <small>Course suivie</small>
              <strong>Livraison en route</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section" id="fonctionnement">
        <div className="section-heading">
          <div>
            <p className="landing-eyebrow">Simple du départ à l&apos;arrivée</p>
            <h2>Une livraison en trois mouvements.</h2>
          </div>
          <p>
            Pas d&apos;appels dans tous les sens. Chaque action importante reste
            visible dans Wona.
          </p>
        </div>

        <div className="steps-grid">
          <article className="step-card featured">
            <span className="step-number">01</span>
            <div className="step-symbol" aria-hidden="true">
              +
            </div>
            <h3>Publiez votre colis</h3>
            <p>
              Indiquez le départ, la destination et les informations utiles
              pour la course.
            </p>
          </article>

          <article className="step-card">
            <span className="step-number">02</span>
            <div className="step-symbol route-symbol" aria-hidden="true">
              ↗
            </div>
            <h3>Un livreur prend la route</h3>
            <p>
              Un livreur disponible accepte la course et suit les étapes de
              retrait et de livraison.
            </p>
          </article>

          <article className="step-card dark">
            <span className="step-number">03</span>
            <div className="step-symbol" aria-hidden="true">
              ✓
            </div>
            <h3>Suivez et confirmez</h3>
            <p>
              Consultez l&apos;avancement et sécurisez la remise du colis avec le
              code de livraison.
            </p>
          </article>
        </div>
      </section>

      <section className="audience-section" id="pour-qui">
        <div className="audience-intro">
          <p className="landing-eyebrow">Une app, deux façons d&apos;avancer</p>
          <h2>Wona travaille des deux côtés de la livraison.</h2>
          <p>
            Au démarrage, choisissez votre profil. L&apos;expérience s&apos;adapte à
            votre activité.
          </p>
        </div>

        <div className="audience-cards">
          <article className="audience-card seller-card">
            <span className="audience-label">Pour les vendeurs</span>
            <h3>Expédiez sans perdre le fil.</h3>
            <ul>
              <li>Publier une demande de livraison</li>
              <li>Voir les livreurs et suivre la course</li>
              <li>Consulter l&apos;historique de ses colis</li>
            </ul>
          </article>

          <article className="audience-card courier-card-landing">
            <span className="audience-label">Pour les livreurs</span>
            <h3>Trouvez des courses près de vous.</h3>
            <ul>
              <li>Recevoir les demandes disponibles</li>
              <li>Gérer chaque étape de la livraison</li>
              <li>Suivre ses courses et ses revenus</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="download-section" id="telecharger">
        <div className="download-copy">
          <p className="landing-eyebrow light">Wona dans votre poche</p>
          <h2>Prêt à faire circuler vos colis&nbsp;?</h2>
          <p>
            Installez directement l&apos;APK Android ou retrouvez bientôt Wona sur
            Google Play et l&apos;App Store.
          </p>
        </div>

        <div className="download-options">
          <DownloadButton
            href={apkUrl}
            eyebrow="Télécharger directement"
            label="APK Android"
            icon="download"
            download
          />
          <DownloadButton
            href={playStoreUrl}
            eyebrow="Disponible sur"
            label="Google Play"
            icon="google-play"
          />
          <DownloadButton
            href={appStoreUrl}
            eyebrow="Télécharger dans"
            label="App Store"
            icon="app-store"
          />
          <p id="disponibilite" className="download-note">
            Android 7+ · Version iPhone prévue · Installation gratuite
          </p>
        </div>
      </section>

      <section className="faq-section" id="questions">
        <div className="faq-title">
          <p className="landing-eyebrow">Questions utiles</p>
          <h2>Avant votre première course.</h2>
        </div>

        <div className="faq-list">
          <details>
            <summary>Wona est-elle réservée aux vendeurs&nbsp;?</summary>
            <p>
              Non. La même application accueille les vendeurs qui publient
              des colis et les livreurs qui souhaitent effectuer des courses.
            </p>
          </details>
          <details>
            <summary>Où le service sera-t-il disponible&nbsp;?</summary>
            <p>
              Le lancement est pensé pour Lomé, avec une extension progressive
              vers d&apos;autres zones du Togo.
            </p>
          </details>
          <details>
            <summary>Pourquoi proposer un APK en plus du Play Store&nbsp;?</summary>
            <p>
              L&apos;APK permet une installation Android directe pendant la phase
              de lancement. La version Play Store simplifiera ensuite les mises
              à jour automatiques.
            </p>
          </details>
        </div>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand footer-brand" href="#accueil">
          <span className="landing-brand-mark" aria-hidden="true">
            W
          </span>
          <span>WONA</span>
        </a>
        <p>Livrer en confiance, au Togo.</p>
        <div>
          <span>© 2026 Wona</span>
          <a href="/admin">Administration</a>
        </div>
      </footer>
    </main>
  );
}
