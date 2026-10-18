"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API_URL = (
  process.env.NEXT_PUBLIC_WONA_API_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

type Tab =
  | "overview"
  | "couriers"
  | "deliveries"
  | "users"
  | "reports"
  | "payments"
  | "settings";

type Dashboard = {
  utilisateurs: number;
  vendeurs: number;
  livreurs: number;
  livreurs_en_attente: number;
  courses_total: number;
  courses_actives: number;
  courses_livrees_aujourdhui: number;
  litiges_ouverts: number;
  volume_livraisons: number | string;
  repartition_statuts: Array<{ statut: string; total: number }>;
};

type Document = {
  id: string;
  type_label: string;
  url_telechargement: string;
  statut: string;
  commentaire_admin: string;
};

type Courier = {
  id: string;
  nom: string;
  telephone: string;
  ville: string;
  moyen_transport: string;
  immatriculation_moto: string;
  statut_verification: string;
  statut_disponibilite: string;
  commentaire_verification: string;
  note_moyenne: string;
  nombre_avis: number;
  date_inscription: string;
  compte_actif: boolean;
  documents: Document[];
};

type Delivery = {
  id: string;
  reference: string;
  vendeur_nom: string;
  livreur_nom?: string | null;
  destinataire_nom: string;
  zone_depart: string;
  zone_arrivee: string;
  prix_livraison: string;
  montant_a_recuperer: string;
  methode_paiement: string;
  urgence: string;
  statut: string;
  date_creation: string;
};

type User = {
  id: string;
  telephone: string;
  nom_complet: string;
  role: string;
  telephone_verifie: boolean;
  is_active: boolean;
  date_joined: string;
};

type Report = {
  id: string;
  reference_course: string;
  auteur_nom: string;
  motif: string;
  description: string;
  statut: string;
  resolution: string;
  date_creation: string;
};

type Payment = {
  id: string;
  reference_course: string;
  type: string;
  montant: string;
  methode: string;
  reference: string;
  statut: string;
  date_creation: string;
};

type Zone = {
  id: string;
  nom: string;
  ville: string;
  latitude: string;
  longitude: string;
  rayon_km: string;
  active: boolean;
};

type Settings = {
  commission_pourcentage: string;
  commission_fixe: string;
  telephone_support: string;
  whatsapp_support: string;
  prix_livraison_minimum: string;
};

type Paginated<T> = { results: T[] };
type JsonRecord = Record<string, unknown>;

function messageFrom(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload.map(messageFrom).join(" ");
  if (payload && typeof payload === "object") {
    const record = payload as JsonRecord;
    return messageFrom(
      record.detail || record.message || Object.values(record)[0],
    );
  }
  return "Une erreur est survenue.";
}

async function refreshToken() {
  const refresh = sessionStorage.getItem("wona.admin.refresh");
  if (!refresh) return null;
  const response = await fetch(`${API_URL}/auth/token/rafraichir/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    sessionStorage.clear();
    return null;
  }
  const payload = (await response.json()) as {
    access: string;
    refresh?: string;
  };
  sessionStorage.setItem("wona.admin.access", payload.access);
  if (payload.refresh) {
    sessionStorage.setItem("wona.admin.refresh", payload.refresh);
  }
  return payload.access;
}

async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const token = sessionStorage.getItem("wona.admin.access");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && (await refreshToken())) {
    return api<T>(path, init, false);
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(messageFrom(payload));
  return payload as T;
}

async function downloadDocument(url: string) {
  const send = async () => {
    const token = sessionStorage.getItem("wona.admin.access");
    return fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };
  let response = await send();
  if (response.status === 401 && (await refreshToken())) {
    response = await send();
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(messageFrom(payload));
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = "document-livreur";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
}

const NAV: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "overview", label: "Vue d’ensemble", icon: "⌂" },
  { id: "couriers", label: "Livreurs", icon: "♙" },
  { id: "deliveries", label: "Livraisons", icon: "◇" },
  { id: "users", label: "Utilisateurs", icon: "◎" },
  { id: "reports", label: "Litiges", icon: "!" },
  { id: "payments", label: "Paiements", icon: "₣" },
  { id: "settings", label: "Zones & réglages", icon: "⚙" },
];

const LABELS: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  refuse: "Refusé",
  suspendu: "Suspendu",
  brouillon: "Brouillon",
  acceptee: "Acceptée",
  en_route_retrait: "Vers le retrait",
  arrive_retrait: "Au retrait",
  colis_recupere: "Colis récupéré",
  en_livraison: "En livraison",
  livree: "Livrée",
  echec: "Échec",
  annulee_vendeur: "Annulée vendeur",
  annulee_livreur: "Annulée livreur",
  litige: "Litige",
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  rejete: "Rejeté",
  non_paye: "Non payé",
  paye: "Payé",
  rembourse: "Remboursé",
  conteste: "Contesté",
};

const label = (value: string) => LABELS[value] || value.replaceAll("_", " ");
const money = (value: string | number) =>
  `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
const date = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const rows = <T,>(payload: T[] | Paginated<T>) =>
  Array.isArray(payload) ? payload : payload.results;

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [booting, setBooting] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (target: Tab) => {
    setLoading(true);
    setError("");
    try {
      if (target === "overview") {
        setDashboard(
          await api<Dashboard>("/administration/tableau-de-bord/"),
        );
      } else if (target === "couriers") {
        setCouriers(
          rows(
            await api<Courier[] | Paginated<Courier>>(
              "/administration/livreurs/?page_size=100",
            ),
          ),
        );
      } else if (target === "deliveries") {
        setDeliveries(
          rows(
            await api<Delivery[] | Paginated<Delivery>>(
              "/administration/courses/?page_size=100",
            ),
          ),
        );
      } else if (target === "users") {
        setUsers(
          rows(
            await api<User[] | Paginated<User>>(
              "/administration/utilisateurs/?page_size=100",
            ),
          ),
        );
      } else if (target === "reports") {
        setReports(
          rows(
            await api<Report[] | Paginated<Report>>(
              "/administration/signalements/?page_size=100",
            ),
          ),
        );
      } else if (target === "payments") {
        setPayments(
          rows(
            await api<Payment[] | Paginated<Payment>>(
              "/administration/paiements/?page_size=100",
            ),
          ),
        );
      } else {
        const [zonePayload, settingPayload] = await Promise.all([
          api<Zone[] | Paginated<Zone>>(
            "/administration/zones/?page_size=100",
          ),
          api<Settings>("/administration/parametres/"),
        ]);
        setZones(rows(zonePayload));
        setSettings(settingPayload);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const resume = async () => {
      if (sessionStorage.getItem("wona.admin.refresh")) {
        const access = await refreshToken();
        if (access) {
          setAuthenticated(true);
          await load("overview");
        }
      }
      setBooting(false);
    };
    resume().catch(() => setBooting(false));
  }, [load]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = await api<{ access: string; refresh: string }>(
        "/auth/admin/connexion/",
        {
          method: "POST",
          body: JSON.stringify({
            telephone: phone,
            mot_de_passe: password,
          }),
        },
        false,
      );
      sessionStorage.setItem("wona.admin.access", payload.access);
      sessionStorage.setItem("wona.admin.refresh", payload.refresh);
      setPassword("");
      await load("overview");
      setAuthenticated(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.clear();
    setAuthenticated(false);
    setDashboard(null);
  };

  const selectTab = (target: Tab) => {
    setTab(target);
    load(target).catch(() => {});
  };

  const mutate = async (
    path: string,
    body: JsonRecord = {},
    reload: Tab = tab,
  ) => {
    setLoading(true);
    setError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      await load(reload);
      if (reload !== "overview") {
        api<Dashboard>("/administration/tableau-de-bord/")
          .then(setDashboard)
          .catch(() => {});
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <main className="boot">
        <div className="brand-mark">W</div>
        <p>Ouverture du centre de contrôle…</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="login-shell">
        <section className="login-story">
          <div className="wordmark">WONA</div>
          <div className="story-copy">
            <p className="eyebrow">CENTRE DE CONTRÔLE</p>
            <h1>Les bonnes décisions, au bon moment.</h1>
            <p>
              Validez les livreurs, surveillez chaque course et protégez la
              confiance entre vendeurs, coursiers et destinataires.
            </p>
          </div>
          <p className="story-foot">Lomé · Togo</p>
        </section>
        <section className="login-panel">
          <form className="login-card" onSubmit={login}>
            <div className="login-logo">W</div>
            <p className="eyebrow">ACCÈS RÉSERVÉ</p>
            <h2>Administration Wona</h2>
            <p className="muted">
              Utilisez le compte administrateur créé sur l’API Wona.
            </p>
            <label>
              Numéro de téléphone
              <div className="phone-field">
                <span>+228</span>
                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="90000000"
                  required
                />
              </div>
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <div className="error-banner">{error}</div> : null}
            <button className="primary wide" disabled={loading}>
              {loading ? "Vérification…" : "Ouvrir le centre de contrôle"}
            </button>
            <p className="security-note">
              Session limitée à cet onglet · Toutes les décisions sont
              journalisées.
            </p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <span className="logo-box">W</span>
            <div>
              <strong>WONA</strong>
              <small>Opérations</small>
            </div>
          </div>
          <nav>
            {NAV.map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? "active" : ""}
                onClick={() => selectTab(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
                {item.id === "couriers" &&
                dashboard?.livreurs_en_attente ? (
                  <b>{dashboard.livreurs_en_attente}</b>
                ) : null}
                {item.id === "reports" && dashboard?.litiges_ouverts ? (
                  <b>{dashboard.litiges_ouverts}</b>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <p>Administration sécurisée</p>
          <button className="logout-link" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">WONA · LOMÉ</p>
            <h1>{NAV.find((item) => item.id === tab)?.label}</h1>
          </div>
          <div className="top-actions">
            <span className="live-dot">API connectée</span>
            <button className="icon-action" onClick={() => load(tab)}>
              ↻
            </button>
            <div className="admin-avatar">AD</div>
          </div>
        </header>

        {error ? (
          <div className="error-banner page-error">
            <span>{error}</span>
            <button onClick={() => load(tab)}>Réessayer</button>
          </div>
        ) : null}
        {loading ? <div className="loading-line" /> : null}

        <div className="page-content">
          {tab === "overview" ? (
            <Overview dashboard={dashboard} onNavigate={selectTab} />
          ) : null}
          {tab === "couriers" ? (
            <Couriers
              items={couriers}
              onDecision={(id, decision) => {
                const commentaire =
                  window.prompt(
                    decision === "valider"
                      ? "Commentaire facultatif"
                      : "Motif à communiquer au livreur",
                  ) || "";
                if (decision !== "valider" && !commentaire.trim()) return;
                mutate(
                  `/administration/livreurs/${id}/${decision}/`,
                  { commentaire },
                  "couriers",
                );
              }}
              onDocument={(id, statut) => {
                const commentaire =
                  window.prompt(
                    statut === "valide"
                      ? "Commentaire facultatif"
                      : "Motif du refus du document",
                  ) || "";
                if (statut === "refuse" && !commentaire.trim()) return;
                mutate(
                  `/administration/documents/${id}/examiner/`,
                  { statut, commentaire },
                  "couriers",
                );
              }}
            />
          ) : null}
          {tab === "deliveries" ? (
            <Deliveries items={deliveries} />
          ) : null}
          {tab === "users" ? (
            <Users
              items={users}
              onToggle={(item) =>
                mutate(
                  `/administration/utilisateurs/${item.id}/${
                    item.is_active ? "suspendre" : "reactiver"
                  }/`,
                  {},
                  "users",
                )
              }
            />
          ) : null}
          {tab === "reports" ? (
            <Reports
              items={reports}
              onTreat={(item, status) => {
                const resolution =
                  window.prompt("Note de résolution obligatoire") || "";
                if (!resolution.trim()) return;
                mutate(
                  `/administration/signalements/${item.id}/traiter/`,
                  { statut: status, resolution },
                  "reports",
                );
              }}
            />
          ) : null}
          {tab === "payments" ? (
            <Payments
              items={payments}
              onUpdate={(item, status) => {
                const reference =
                  window.prompt(
                    "Référence de transaction ou note de rapprochement",
                    item.reference,
                  ) || "";
                mutate(
                  `/administration/paiements/${item.id}/mettre_a_jour/`,
                  { statut: status, reference },
                  "payments",
                );
              }}
            />
          ) : null}
          {tab === "settings" ? (
            <SettingsPanel
              key={
                settings
                  ? Object.values(settings).join("-")
                  : "settings-loading"
              }
              zones={zones}
              settings={settings}
              onReload={() => load("settings")}
              onError={setError}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Overview({
  dashboard,
  onNavigate,
}: {
  dashboard: Dashboard | null;
  onNavigate: (tab: Tab) => void;
}) {
  const max = Math.max(
    1,
    ...(dashboard?.repartition_statuts.map((item) => item.total) || [1]),
  );
  return (
    <>
      <section className="hero-strip">
        <div>
          <p className="eyebrow">ÉTAT DES OPÉRATIONS</p>
          <h2>Le réseau Wona en un coup d’œil.</h2>
          <p>
            Les décisions urgentes remontent en premier. Les montants sont
            suivis sans confusion entre livraison et encaissement.
          </p>
        </div>
        <button className="primary" onClick={() => onNavigate("couriers")}>
          Examiner les livreurs
        </button>
      </section>
      <section className="metrics">
        <Metric
          label="Courses actives"
          value={dashboard?.courses_actives || 0}
          detail={`${dashboard?.courses_total || 0} au total`}
          tone="orange"
        />
        <Metric
          label="Livreurs à valider"
          value={dashboard?.livreurs_en_attente || 0}
          detail={`${dashboard?.livreurs || 0} inscrits`}
          tone="navy"
        />
        <Metric
          label="Livrées aujourd’hui"
          value={dashboard?.courses_livrees_aujourdhui || 0}
          detail={money(dashboard?.volume_livraisons || 0)}
          tone="teal"
        />
        <Metric
          label="Litiges ouverts"
          value={dashboard?.litiges_ouverts || 0}
          detail="À traiter"
          tone="red"
        />
      </section>
      <section className="overview-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">FLUX DES COURSES</p>
              <h3>Répartition par statut</h3>
            </div>
          </div>
          <div className="status-bars">
            {dashboard?.repartition_statuts.length ? (
              dashboard.repartition_statuts.map((item) => (
                <div className="bar-row" key={item.statut}>
                  <span>{label(item.statut)}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(item.total / max) * 100}%` }}
                    />
                  </div>
                  <strong>{item.total}</strong>
                </div>
              ))
            ) : (
              <Empty text="Aucune course enregistrée" />
            )}
          </div>
        </article>
        <article className="panel people-panel">
          <p className="eyebrow">COMMUNAUTÉ</p>
          <h3>Profils actifs</h3>
          <div className="people-number">
            {dashboard?.utilisateurs || 0}
          </div>
          <div className="people-split">
            <div>
              <strong>{dashboard?.vendeurs || 0}</strong>
              <span>Vendeurs</span>
            </div>
            <div>
              <strong>{dashboard?.livreurs || 0}</strong>
              <span>Livreurs</span>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function Metric({
  label: title,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  return (
    <article className={`metric ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Couriers({
  items,
  onDecision,
  onDocument,
}: {
  items: Courier[];
  onDecision: (
    id: string,
    decision: "valider" | "refuser" | "suspendre",
  ) => void;
  onDocument: (id: string, status: "valide" | "refuse") => void;
}) {
  return (
    <section className="stack">
      {!items.length ? (
        <Empty text="Aucun livreur inscrit" />
      ) : (
        items.map((courier) => (
          <article className="courier-card" key={courier.id}>
            <div className="courier-summary">
              <div className="courier-avatar">
                {(courier.nom || "L").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="title-row">
                  <h3>{courier.nom || "Nom non renseigné"}</h3>
                  <Status value={courier.statut_verification} />
                </div>
                <p>
                  {courier.telephone} · {courier.ville} ·{" "}
                  {label(courier.moyen_transport)}
                </p>
                <small>
                  Inscrit le {date(courier.date_inscription)} ·{" "}
                  {courier.immatriculation_moto || "Sans immatriculation"}
                </small>
              </div>
              <div className="courier-actions">
                {courier.statut_verification !== "valide" ? (
                  <button
                    className="success"
                    onClick={() => onDecision(courier.id, "valider")}
                  >
                    Valider
                  </button>
                ) : (
                  <button
                    className="danger"
                    onClick={() => onDecision(courier.id, "suspendre")}
                  >
                    Suspendre
                  </button>
                )}
                <button
                  className="secondary"
                  onClick={() => onDecision(courier.id, "refuser")}
                >
                  Refuser
                </button>
              </div>
            </div>
            {courier.commentaire_verification ? (
              <div className="notice">{courier.commentaire_verification}</div>
            ) : null}
            <div className="documents">
              {courier.documents.length ? (
                courier.documents.map((document) => (
                  <div className="document" key={document.id}>
                    <div>
                      <strong>{document.type_label}</strong>
                      <Status value={document.statut} />
                    </div>
                    <div className="document-actions">
                      <button
                        className="open-document"
                        onClick={() =>
                          downloadDocument(document.url_telechargement).catch(
                            (reason) =>
                              window.alert(
                                reason instanceof Error
                                  ? reason.message
                                  : "Document indisponible.",
                              ),
                          )
                        }
                      >
                        Ouvrir
                      </button>
                      <button
                        className="success small"
                        onClick={() => onDocument(document.id, "valide")}
                      >
                        ✓
                      </button>
                      <button
                        className="danger small"
                        onClick={() => onDocument(document.id, "refuse")}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">Aucun document téléversé.</p>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function Deliveries({ items }: { items: Delivery[] }) {
  return (
    <DataTable
      headers={[
        "Référence",
        "Trajet",
        "Parties",
        "Prix livraison",
        "Encaissement",
        "Statut",
        "Créée le",
      ]}
    >
      {items.map((item) => (
        <tr key={item.id}>
          <td>
            <strong>{item.reference}</strong>
            <small>{label(item.urgence)}</small>
          </td>
          <td>
            {item.zone_depart}
            <small>→ {item.zone_arrivee}</small>
          </td>
          <td>
            {item.vendeur_nom || "Vendeur"}
            <small>{item.livreur_nom || "Non attribuée"}</small>
          </td>
          <td>{money(item.prix_livraison)}</td>
          <td>{money(item.montant_a_recuperer)}</td>
          <td>
            <Status value={item.statut} />
          </td>
          <td>{date(item.date_creation)}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function Users({
  items,
  onToggle,
}: {
  items: User[];
  onToggle: (user: User) => void;
}) {
  return (
    <DataTable
      headers={[
        "Utilisateur",
        "Téléphone",
        "Rôle",
        "Téléphone vérifié",
        "État",
        "Inscription",
        "Action",
      ]}
    >
      {items.map((item) => (
        <tr key={item.id}>
          <td>
            <strong>{item.nom_complet || "Sans nom"}</strong>
          </td>
          <td>{item.telephone}</td>
          <td>{label(item.role)}</td>
          <td>{item.telephone_verifie ? "Oui" : "Non"}</td>
          <td>
            <Status value={item.is_active ? "valide" : "suspendu"} />
          </td>
          <td>{date(item.date_joined)}</td>
          <td>
            <button
              className={item.is_active ? "danger" : "success"}
              onClick={() => onToggle(item)}
            >
              {item.is_active ? "Suspendre" : "Réactiver"}
            </button>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function Reports({
  items,
  onTreat,
}: {
  items: Report[];
  onTreat: (item: Report, status: "en_cours" | "resolu" | "rejete") => void;
}) {
  return (
    <section className="stack">
      {!items.length ? (
        <Empty text="Aucun signalement" />
      ) : (
        items.map((item) => (
          <article className="report-card" key={item.id}>
            <div className="report-top">
              <div>
                <p className="eyebrow">{item.reference_course}</p>
                <h3>{label(item.motif)}</h3>
              </div>
              <Status value={item.statut} />
            </div>
            <p>{item.description}</p>
            <small>
              Signalé par {item.auteur_nom || "Utilisateur"} ·{" "}
              {date(item.date_creation)}
            </small>
            {item.resolution ? (
              <div className="notice">
                <strong>Résolution :</strong> {item.resolution}
              </div>
            ) : null}
            <div className="inline-actions">
              <button
                className="secondary"
                onClick={() => onTreat(item, "en_cours")}
              >
                Prendre en charge
              </button>
              <button
                className="success"
                onClick={() => onTreat(item, "resolu")}
              >
                Résoudre
              </button>
              <button
                className="danger"
                onClick={() => onTreat(item, "rejete")}
              >
                Rejeter
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function Payments({
  items,
  onUpdate,
}: {
  items: Payment[];
  onUpdate: (item: Payment, status: string) => void;
}) {
  return (
    <DataTable
      headers={[
        "Course",
        "Type",
        "Montant",
        "Méthode",
        "Référence",
        "Statut",
        "Rapprochement",
      ]}
    >
      {items.map((item) => (
        <tr key={item.id}>
          <td>
            <strong>{item.reference_course}</strong>
          </td>
          <td>{label(item.type)}</td>
          <td>{money(item.montant)}</td>
          <td>{label(item.methode)}</td>
          <td>{item.reference || "—"}</td>
          <td>
            <Status value={item.statut} />
          </td>
          <td>
            <select
              value={item.statut}
              onChange={(event) => onUpdate(item, event.target.value)}
            >
              {["non_paye", "en_attente", "paye", "rembourse", "conteste"].map(
                (status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ),
              )}
            </select>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function SettingsPanel({
  zones,
  settings,
  onReload,
  onError,
}: {
  zones: Zone[];
  settings: Settings | null;
  onReload: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState<Settings | null>(settings);
  const [zone, setZone] = useState({
    nom: "",
    ville: "Lomé",
    latitude: "",
    longitude: "",
    rayon_km: "10",
  });

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    try {
      await api("/administration/parametres/", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      await onReload();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Réglages non enregistrés.");
    }
  };

  const createZone = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api("/administration/zones/", {
        method: "POST",
        body: JSON.stringify({ ...zone, active: true }),
      });
      setZone({
        nom: "",
        ville: "Lomé",
        latitude: "",
        longitude: "",
        rayon_km: "10",
      });
      await onReload();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Zone non ajoutée.");
    }
  };

  const toggleZone = async (item: Zone) => {
    try {
      await api(`/administration/zones/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      });
      await onReload();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Zone non modifiée.");
    }
  };

  return (
    <section className="settings-grid">
      <article className="panel">
        <p className="eyebrow">COUVERTURE</p>
        <h3>Zones Wona</h3>
        <div className="zone-list">
          {zones.map((item) => (
            <div className="zone-row" key={item.id}>
              <div>
                <strong>{item.nom}</strong>
                <small>
                  {item.ville} · rayon {item.rayon_km} km
                </small>
              </div>
              <button
                className={item.active ? "success" : "secondary"}
                onClick={() => toggleZone(item)}
              >
                {item.active ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
        <form className="compact-form" onSubmit={createZone}>
          <h4>Ajouter une zone</h4>
          <div className="form-grid">
            <label>
              Nom
              <input
                value={zone.nom}
                onChange={(event) =>
                  setZone({ ...zone, nom: event.target.value })
                }
                required
              />
            </label>
            <label>
              Ville
              <input
                value={zone.ville}
                onChange={(event) =>
                  setZone({ ...zone, ville: event.target.value })
                }
                required
              />
            </label>
            <label>
              Latitude
              <input
                value={zone.latitude}
                onChange={(event) =>
                  setZone({ ...zone, latitude: event.target.value })
                }
                required
              />
            </label>
            <label>
              Longitude
              <input
                value={zone.longitude}
                onChange={(event) =>
                  setZone({ ...zone, longitude: event.target.value })
                }
                required
              />
            </label>
            <label>
              Rayon (km)
              <input
                type="number"
                min="1"
                value={zone.rayon_km}
                onChange={(event) =>
                  setZone({ ...zone, rayon_km: event.target.value })
                }
                required
              />
            </label>
          </div>
          <button className="primary">Ajouter la zone</button>
        </form>
      </article>
      <article className="panel">
        <p className="eyebrow">RÈGLES FINANCIÈRES</p>
        <h3>Paramètres de la plateforme</h3>
        {form ? (
          <form className="compact-form" onSubmit={saveSettings}>
            <label>
              Commission (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.commission_pourcentage}
                onChange={(event) =>
                  setForm({
                    ...form,
                    commission_pourcentage: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Commission minimale (FCFA)
              <input
                type="number"
                min="0"
                value={form.commission_fixe}
                onChange={(event) =>
                  setForm({ ...form, commission_fixe: event.target.value })
                }
              />
            </label>
            <label>
              Prix minimum d’une course (FCFA)
              <input
                type="number"
                min="0"
                value={form.prix_livraison_minimum}
                onChange={(event) =>
                  setForm({
                    ...form,
                    prix_livraison_minimum: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Téléphone support
              <input
                value={form.telephone_support}
                onChange={(event) =>
                  setForm({ ...form, telephone_support: event.target.value })
                }
              />
            </label>
            <label>
              WhatsApp support
              <input
                value={form.whatsapp_support}
                onChange={(event) =>
                  setForm({ ...form, whatsapp_support: event.target.value })
                }
              />
            </label>
            <button className="primary">Enregistrer les paramètres</button>
          </form>
        ) : (
          <Empty text="Paramètres indisponibles" />
        )}
      </article>
    </section>
  );
}

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{label(value)}</span>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>◇</span>
      <strong>{text}</strong>
      <p>Les nouvelles données apparaîtront ici automatiquement.</p>
    </div>
  );
}
