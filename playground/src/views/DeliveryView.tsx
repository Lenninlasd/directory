import { useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { buildWhatsappUrl } from '../features/businesses/whatsapp.ts';
import { strings } from '../strings.ts';
import { BusinessDetailDialog } from '../BusinessDetailDialog.tsx';
import { styleFor } from '../categories.ts';
import { ChatIcon, ChevronDownIcon, GridIcon, PinIcon, ScooterIcon, SearchIcon, StoreIcon } from '../icons.tsx';
import type { PlaygroundBusiness } from '../mockData.ts';
import type { ViewProps } from './index.ts';

const ALL = '__all__';

// Delivery-app style: location header, search, category chips, featured carousel, full list.
export function DeliveryView({ businesses }: ViewProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const [selected, setSelected] = useState<PlaygroundBusiness | null>(null);

  const categories = useMemo(() => [...new Set(businesses.map((business) => business.category))], [businesses]);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return businesses.filter(
      (business) =>
        (category === ALL || business.category === category) &&
        (term === '' || normalize(`${business.name} ${business.category}`).includes(term)),
    );
  }, [businesses, search, category]);

  const featured = filtered.filter((business) => business.hasPhysicalStore);

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <header className="sticky top-12 z-[5] space-y-3 bg-white px-4 pt-3 pb-3 shadow-[0_1px_0_rgb(0_0_0/0.06)]">
        <button className="flex items-center gap-1.5 text-sm">
          <PinIcon className="size-4 text-emerald-600" />
          <span className="text-stone-500">Entregar en</span>
          <span className="font-semibold text-stone-900">Alameda del Río</span>
          <ChevronDownIcon className="size-4 text-stone-500" />
        </button>
        <label className="flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500">
          <SearchIcon className="size-5 text-stone-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar negocios o categorías"
            className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-500"
          />
        </label>
      </header>

      <nav aria-label="Categorías" className="flex gap-4 overflow-x-auto px-4 py-4 [scrollbar-width:none]">
        <CategoryChip
          label="Todos"
          icon={GridIcon}
          tint="bg-stone-100 text-stone-700"
          selected={category === ALL}
          onClick={() => setCategory(ALL)}
        />
        {categories.map((name) => {
          const style = styleFor(name);
          return (
            <CategoryChip
              key={name}
              label={name}
              icon={style.icon}
              tint={style.chip}
              selected={category === name}
              onClick={() => setCategory(category === name ? ALL : name)}
            />
          );
        })}
      </nav>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-stone-500">
          <SearchIcon className="size-10" />
          <p className="font-medium text-stone-700">No encontramos negocios</p>
          <p className="text-sm">Prueba con otra búsqueda o categoría.</p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="mt-2">
              <SectionTitle title="Visítalos en su tienda" subtitle="Negocios con local en el conjunto" />
              <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
                {featured.map((business) => (
                  <li key={business.id} className="w-64 shrink-0 snap-start sm:w-72">
                    <BusinessTile business={business} onOpen={() => setSelected(business)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <SectionTitle
              title={category === ALL ? 'Todos los negocios' : category}
              subtitle={`${filtered.length} ${filtered.length === 1 ? 'negocio' : 'negocios'}`}
            />
            <ul className="grid gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((business) => (
                <li key={business.id}>
                  <BusinessTile business={business} onOpen={() => setSelected(business)} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <BusinessDetailDialog business={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function CategoryChip(props: {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tint: string;
  selected: boolean;
  onClick: () => void;
}) {
  const { label, icon: IconComponent, tint, selected, onClick } = props;
  return (
    <button onClick={onClick} aria-pressed={selected} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
      <span
        className={`grid size-14 place-items-center rounded-2xl transition ${tint} ${
          selected ? 'ring-2 ring-stone-900 ring-offset-2' : ''
        }`}
      >
        <IconComponent className="size-7" />
      </span>
      <span className={`w-full truncate text-center text-xs ${selected ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>
        {label}
      </span>
    </button>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3 px-4">
      <h2 className="text-xl font-bold tracking-tight text-stone-900">{title}</h2>
      <p className="text-sm text-stone-500">{subtitle}</p>
    </div>
  );
}

// The whole tile opens the detail modal through a stretched button; the WhatsApp link sits above it.
function BusinessTile({ business, onOpen }: { business: PlaygroundBusiness; onOpen: () => void }) {
  const style = styleFor(business.category);
  const IconComponent = style.icon;
  const coverImage = business.details?.images[0];

  return (
    <article className="group relative">
      <button
        onClick={onOpen}
        aria-label={`Ver detalles de ${business.name}`}
        className="absolute inset-0 z-[1] rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 focus-visible:outline-none"
      />
      <div className={`relative aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br ${style.cover}`}>
        <IconComponent className="absolute -right-4 -bottom-6 size-36 text-white/20 transition group-hover:scale-105" />
        <IconComponent className="absolute top-1/2 left-1/2 size-12 -translate-1/2 text-white" />
        {coverImage && (
          <img
            src={coverImage.url}
            alt=""
            loading="lazy"
            onError={(event) => event.currentTarget.remove()}
            className="absolute inset-0 size-full object-cover transition group-hover:scale-105"
          />
        )}
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-medium text-stone-800 shadow-sm">
          {business.hasPhysicalStore ? <StoreIcon className="size-3.5" /> : <ScooterIcon className="size-3.5" />}
          {business.hasPhysicalStore ? strings.inStore : strings.deliveryOnly}
        </span>
        {business.whatsappNumber !== null && (
          <a
            href={buildWhatsappUrl(business.whatsappNumber)}
            target="_blank"
            rel="noreferrer"
            aria-label={strings.whatsappButtonLabel(business.name)}
            className="absolute right-2 bottom-2 z-[2] grid size-10 place-items-center rounded-full bg-white text-whatsapp shadow-md transition hover:scale-110"
          >
            <ChatIcon className="size-5" />
          </a>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="line-clamp-1 font-semibold text-stone-900" title={business.name}>
          {business.name}
        </h3>
        <p className="line-clamp-1 text-sm text-stone-500">
          {business.category} · {business.locationSummary}
        </p>
        {business.whatsappNumber === null && <p className="text-xs text-stone-400">Sin WhatsApp</p>}
      </div>
    </article>
  );
}

// Accent-insensitive search, so "cafe" matches "Café".
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
