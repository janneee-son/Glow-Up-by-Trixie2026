import { Head, useForm, usePage } from '@inertiajs/react';
import { BriefcaseBusiness, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import InputError from '@/components/input-error';

type Service = {
    id: number;
    name: string;
    price: number;
    description: string | null;
    is_active: boolean;
    image_url: string | null;
};

type Props = { services: Service[] };

const inputClass = 'w-full rounded-xl border border-[#95B1DB] bg-[#FAFCFE] px-3 py-2 text-sm text-[#1F2D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#769AD0]/40';

function ServiceFields({ service }: { service?: Service }) {
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: service?.name ?? '',
        price: service?.price.toString() ?? '',
        description: service?.description ?? '',
        image: null as File | null,
        remove_image: false,
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        const options = { forceFormData: true, onSuccess: () => { if (!service) reset(); } };
        if (service) {
            patch(`/artist/services/${service.id}`, options);
        } else {
            post('/artist/services', options);
        }
    }

    return (
        <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-[#D3DFEF] bg-white p-5">
            <div className="flex items-center gap-2 font-semibold text-[#1F2D40]">
                {service ? <Pencil className="h-4 w-4 text-[#5F83AB]" /> : <Plus className="h-4 w-4 text-[#5F83AB]" />}
                {service ? 'Edit service' : 'Add a service'}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-[#5B6B82]">Service name
                    <input className={inputClass} maxLength={100} value={data.name} onChange={(event) => setData('name', event.target.value)} required />
                    <InputError message={errors.name} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#5B6B82]">Price (₱)
                    <input className={inputClass} type="number" min="0" max="1000000" step="0.01" value={data.price} onChange={(event) => setData('price', event.target.value)} required />
                    <InputError message={errors.price} />
                </label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold text-[#5B6B82]">Description (optional)
                <textarea className={inputClass} maxLength={300} rows={3} value={data.description} onChange={(event) => setData('description', event.target.value)} />
                <InputError message={errors.description} />
            </label>
            <div className="grid gap-2 text-xs font-semibold text-[#5B6B82]">
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[#95B1DB] px-4 py-2 text-[#4A6A93] hover:bg-[#E6EEF8]">
                    <ImagePlus className="h-4 w-4" /> {data.image ? data.image.name : service?.image_url ? 'Replace service photo' : 'Add a service photo'}
                    <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setData('image', event.target.files?.[0] ?? null); setData('remove_image', false); }} />
                </label>
                {service?.image_url && <label className="flex items-center gap-2 font-normal"><input type="checkbox" checked={data.remove_image} onChange={(event) => setData('remove_image', event.target.checked)} /> Remove current photo</label>}
                <InputError message={errors.image} />
            </div>
            <button disabled={processing} className="w-fit rounded-full bg-[#5F83AB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4E7099] disabled:opacity-50">
                {processing ? 'Saving…' : service ? 'Save changes' : 'Add service'}
            </button>
        </form>
    );
}

function ServiceCard({ service }: { service: Service }) {
    const [editing, setEditing] = useState(false);
    const { patch, delete: destroy, processing } = useForm();

    return (
        <article className="overflow-hidden rounded-2xl border border-[#D3DFEF] bg-white">
            <div className="flex gap-4 p-5">
                {service.image_url ? <img src={service.image_url} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#E6EEF8]"><BriefcaseBusiness className="h-6 w-6 text-[#5F83AB]" /></div>}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-xl font-bold text-[#1F2D40]">{service.name}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${service.is_active ? 'bg-[#E6EEF8] text-[#4A6A93]' : 'bg-[#F2F5F8] text-[#5B6B82]'}`}>{service.is_active ? 'Active' : 'Hidden'}</span>
                    </div>
                    <p className="mt-1 font-semibold text-[#4A6A93]">₱{service.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    {service.description && <p className="mt-2 text-sm text-[#5B6B82]">{service.description}</p>}
                </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[#D3DFEF] bg-[#FAFCFE] p-4">
                <button type="button" onClick={() => patch(`/artist/services/${service.id}/toggle`)} disabled={processing} className="rounded-full border border-[#95B1DB] px-4 py-1.5 text-xs font-semibold text-[#4A6A93] hover:bg-[#E6EEF8]">{service.is_active ? 'Hide from clients' : 'Make active'}</button>
                <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-full border border-[#95B1DB] px-4 py-1.5 text-xs font-semibold text-[#4A6A93] hover:bg-[#E6EEF8]">{editing ? 'Close editor' : 'Edit'}</button>
                <button type="button" onClick={() => { if (window.confirm(`Delete ${service.name}?`)) destroy(`/artist/services/${service.id}`); }} disabled={processing} className="flex items-center gap-1 rounded-full border border-[#D9A5A5] px-4 py-1.5 text-xs font-semibold text-[#A13F3F] hover:bg-[#FDEDED]"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
            {editing && <div className="p-4"><ServiceFields service={service} /></div>}
        </article>
    );
}

export default function ServicesIndex({ services }: Props) {
    const { auth } = usePage<{ auth?: { user?: { name?: string; role?: 'client' | 'artist' | 'admin' } } }>().props;

    return (
        <>
            <Head title="Manage Services" />
            <div className="min-h-screen bg-[#F2F5F8]">
                <DashboardHeader userName={auth?.user?.name ?? 'there'} userRole={auth?.user?.role} active="services" />
                <main className="mx-auto grid max-w-4xl gap-6 px-6 py-10 md:px-12">
                    <div>
                        <p className="mb-1 text-xs uppercase tracking-widest text-[#5F83AB]">Artist tools</p>
                        <h1 className="font-serif text-3xl font-bold text-[#1F2D40]">Manage services</h1>
                        <p className="mt-2 text-sm text-[#5B6B82]">Active services appear on your public page and can be selected when clients book.</p>
                    </div>
                    <ServiceFields />
                    <section className="grid gap-4">
                        <h2 className="font-semibold text-[#1F2D40]">Your services ({services.length})</h2>
                        {services.map((service) => <ServiceCard key={service.id} service={service} />)}
                        {services.length === 0 && <p className="rounded-2xl border border-dashed border-[#95B1DB] bg-white p-6 text-sm text-[#5B6B82]">You haven't added any services yet.</p>}
                    </section>
                </main>
            </div>
        </>
    );
}
