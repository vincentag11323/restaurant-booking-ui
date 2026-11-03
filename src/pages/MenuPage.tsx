import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ErrorBanner, PageTitle } from "../components/ui";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { MenuItem, MenuType } from "../types/api";

const TYPE_LABEL: Record<MenuType, string> = { A_LA_CARTE: "À la carte", SEASONAL_FINE_DINING: "Seasonal fine dining" };

function Dish({ item }: { item: MenuItem }) {
  return (
    <li className="flex flex-col gap-1 border-b border-dotted border-line py-3 last:border-0">
      <div>
        <p className="font-serif text-2xl text-pine">
          {item.name}
          {item.chefPick && <span className="ml-2 align-middle font-sans text-sm font-semibold text-brass">Chef's pick</span>}
        </p>
        <p className="text-muted">{item.description}</p>
        {item.allergens.length > 0 && <p className="text-sm text-muted">Contains: {item.allergens.join(", ")}</p>}
      </div>
      <p className="shrink-0 font-semibold">{formatPrice(item.priceCents)}</p>
    </li>
  );
}

export function MenuPage() {
  const { user } = useAuth();
  const [type, setType] = useState<MenuType>("A_LA_CARTE");
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [safe, setSafe] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setItems(null);
    setError(null);
    api<MenuItem[]>(`/menu?type=${type}`)
      .then((result) => current && setItems(result))
      .catch((err: Error) => current && setError(err.message));
    return () => {
      current = false;
    };
  }, [type]);

  useEffect(() => {
    if (user?.role === "USER") api<MenuItem[]>("/menu/recommendations").then(setSafe).catch(() => setSafe(null));
  }, [user]);

  return (
    <>
      <PageTitle title="Menu" lead="Served at both branches. Tell your server about allergies when you sit down." />
      {user?.role === "USER" && safe && (
        <section aria-labelledby="safe-heading" className="card mb-8 p-5">
          <h2 id="safe-heading" className="text-3xl">Safe for you</h2>
          <p className="text-muted">
            {user.allergies.length ? `Dishes without ${user.allergies.join(", ")}.` : "Add allergies in your profile to filter this list."}
          </p>
          {safe.length === 0 ? <p className="mt-3">Every dish contains one of your allergens. Our chefs can adapt dishes on the night.</p> : <ul>{safe.map((item) => <Dish key={item.id} item={item} />)}</ul>}
        </section>
      )}
      <div role="tablist" aria-label="Menu" className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABEL) as MenuType[]).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={type === t} onClick={() => setType(t)} className={`min-h-11 rounded-[var(--radius-control)] px-4 font-semibold ${type === t ? "bg-pine text-white" : "bg-white text-pine hover:underline"}`}>
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="card p-5">
        {error && <ErrorBanner message={`We couldn't load the menu: ${error}`} />}
        {!error && !items && <p role="status" className="text-muted">Loading the menu…</p>}
        {items && items.length === 0 && <p>This menu is being refreshed. Please check back soon.</p>}
        {items && <ul>{items.map((item) => <Dish key={item.id} item={item} />)}</ul>}
      </div>
    </>
  );
}
