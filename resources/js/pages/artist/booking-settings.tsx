import { Head, useForm, usePage } from '@inertiajs/react';
import { CalendarDays, ChevronDown, MapPin, Settings2 } from 'lucide-react';
import { useState } from 'react';
import DashboardHeader from '@/components/dashboard-header';

type ServiceAreaLevel = 'covered' | 'on_request' | 'not_served';
type ServiceAreaGroup = 'metro_manila' | 'nearby_province';
type ServiceArea = {
    id: number | null;
    name: string;
    fee_group: ServiceAreaGroup;
    level: ServiceAreaLevel;
    starting_fee: number | null;
    note: string | null;
};

type Props = {
    blockedDates: string[];
    serviceAreas: ServiceArea[];
};

function dateInputToday() {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());

    return today.toISOString().slice(0, 10);
}

export default function BookingSettings({ blockedDates = [], serviceAreas = [] }: Props) {
    const { auth } = usePage<{
        auth?: { user?: { name?: string; role?: 'artist' | 'client' | 'admin' } };
    }>().props;
    const [blockedDateToAdd, setBlockedDateToAdd] = useState('');
    const [serviceAreasOpen, setServiceAreasOpen] = useState(false);
    const [serviceAreaToAdd, setServiceAreaToAdd] = useState('');
    const [serviceAreaAddError, setServiceAreaAddError] = useState('');
    const [serviceAreaGroup, setServiceAreaGroup] = useState<ServiceAreaGroup>('metro_manila');
    const [serviceAreaLevel, setServiceAreaLevel] = useState<ServiceAreaLevel>('on_request');
    const {
        data: availabilityData,
        setData: setAvailabilityData,
        patch: saveAvailability,
        processing: availabilityProcessing,
        errors: availabilityErrors,
    } = useForm({ blocked_dates: blockedDates });
    const {
        data: serviceAreaData,
        setData: setServiceAreaData,
        patch: saveServiceAreas,
        processing: serviceAreasProcessing,
        errors: serviceAreaErrors,
    } = useForm({ service_areas: serviceAreas });

    function handleSaveAvailability(event: React.FormEvent) {
        event.preventDefault();
        saveAvailability('/artist/availability', { preserveScroll: true });
    }

    function handleSaveServiceAreas(event: React.FormEvent) {
        event.preventDefault();
        saveServiceAreas('/artist/service-areas', { preserveScroll: true });
    }

    function updateServiceArea(index: number, updates: Partial<ServiceArea>) {
        setServiceAreaData(
            'service_areas',
            serviceAreaData.service_areas.map((area, areaIndex) =>
                areaIndex === index ? { ...area, ...updates } : area,
            ),
        );
    }

    function addServiceArea() {
        const location = serviceAreaToAdd.trim();

        if (!location) return;

        const alreadyAdded = serviceAreaData.service_areas.some(
            (area) => area.name.toLocaleLowerCase() === location.toLocaleLowerCase(),
        );

        if (alreadyAdded) {
            setServiceAreaAddError('That city or municipality is already listed.');
            return;
        }

        setServiceAreaAddError('');
        setServiceAreaData('service_areas', [
            ...serviceAreaData.service_areas,
            {
                id: null,
                name: location,
                fee_group: serviceAreaGroup,
                level: serviceAreaLevel,
                starting_fee: null,
                note: '',
            },
        ]);
        setServiceAreaToAdd('');
    }

    const fieldClass = 'min-h-11 w-full rounded-xl border border-[#d7c0a2] bg-white px-3 text-sm text-[#1a1a1a]';

    return (
        <>
            <Head title="Booking Settings" />
            <div className="min-h-screen bg-[#faf7f4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="booking-settings"
                />
                <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-7 sm:px-6 md:py-10">
                    <section className="rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                            <Settings2 className="h-4 w-4" /> Artist studio
                        </p>
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">Booking Settings</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4a4a4a] sm:text-base">
                            Choose where clients can book and block dates when you are unavailable.
                        </p>
                        <nav aria-label="Booking settings sections" className="mt-5 flex flex-wrap gap-2">
                            <a href="#service-areas" onClick={() => setServiceAreasOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d7c0a2] bg-white px-4 text-sm font-semibold text-[#704f1e]"><MapPin className="h-4 w-4" /> Service Areas</a>
                            <a href="#unavailable-dates" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d7c0a2] bg-white px-4 text-sm font-semibold text-[#704f1e]"><CalendarDays className="h-4 w-4" /> Unavailable Dates</a>
                        </nav>
                    </section>

                    <section id="service-areas" className="scroll-mt-24 rounded-3xl border border-[#e8d7cf] bg-white p-4 shadow-sm sm:p-6">
                        <button type="button" aria-expanded={serviceAreasOpen} aria-controls="service-areas-content" onClick={() => setServiceAreasOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 text-left">
                            <span className="flex min-w-0 items-start gap-3">
                                <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#8a6a2f]" />
                                <span>
                                    <span className="block font-serif text-xl font-bold text-[#1a1a1a]">Booking Service Areas</span>
                                    <span className="mt-1 block text-sm text-[#4a4a4a]">{serviceAreaData.service_areas.filter((area) => area.level !== 'not_served').length} locations accepting requests</span>
                                </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[#704f1e]">{serviceAreasOpen ? 'Hide' : 'Manage'}<ChevronDown className={`h-4 w-4 transition-transform ${serviceAreasOpen ? 'rotate-180' : ''}`} /></span>
                        </button>
                        {serviceAreasOpen && <div id="service-areas-content" className="mt-4 border-t border-[#f0e2dd] pt-4">
                        <form onSubmit={handleSaveServiceAreas} className="space-y-4">
                            <p className="text-sm leading-6 text-[#4a4a4a]">Covered locations can be requested normally. On request locations let customers send a request for you to review and quote a travel fee. Not served locations stay saved here but are hidden from booking choices. New locations start as On request.</p>
                            <ul className="grid gap-3">
                                {serviceAreaData.service_areas.map((area, index) => (
                                    <li key={area.id ?? `new-${index}`} className="rounded-2xl border border-[#f0e2dd] bg-[#fffcf8] p-3 sm:p-4">
                                        <p className="mb-3 break-words font-semibold text-[#1a1a1a]">{area.name}</p>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <label className="grid gap-1 text-xs font-semibold text-[#4a4a4a]">Coverage level<select value={area.level} onChange={(event) => updateServiceArea(index, { level: event.target.value as ServiceAreaLevel })} className={fieldClass}><option value="covered">Covered</option><option value="on_request">On request</option><option value="not_served">Not served</option></select></label>
                                            <label className="grid gap-1 text-xs font-semibold text-[#4a4a4a]">Travel fee group<select value={area.fee_group} onChange={(event) => updateServiceArea(index, { fee_group: event.target.value as ServiceAreaGroup })} className={fieldClass}><option value="metro_manila">Metro Manila</option><option value="nearby_province">Nearby areas</option></select></label>
                                            <label className="grid gap-1 text-xs font-semibold text-[#4a4a4a]">Starting travel fee (₱)<input type="number" min="0" max="1000000" inputMode="numeric" value={area.starting_fee ?? ''} onChange={(event) => updateServiceArea(index, { starting_fee: event.target.value === '' ? null : Number(event.target.value) })} placeholder="Use travel fee group default" className={fieldClass} /></label>
                                            <label className="grid gap-1 text-xs font-semibold text-[#4a4a4a]">Optional note for customers<input value={area.note ?? ''} maxLength={255} onChange={(event) => updateServiceArea(index, { note: event.target.value })} placeholder="For example: weekends only" className={fieldClass} /></label>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className="grid gap-3 rounded-2xl border border-dashed border-[#d7c0a2] p-3 sm:grid-cols-2 sm:p-4">
                                <label className="grid gap-1 text-xs font-semibold text-[#4a4a4a] sm:col-span-2">Add a city or municipality<input aria-label="City or municipality to add" value={serviceAreaToAdd} maxLength={100} onChange={(event) => { setServiceAreaToAdd(event.target.value); setServiceAreaAddError(''); }} placeholder="City or municipality" className={fieldClass} /></label>
                                <label className="grid gap-1 text-xs font-semibold text-[#4a4a4a]">Travel fee group<select aria-label="Travel fee area" value={serviceAreaGroup} onChange={(event) => setServiceAreaGroup(event.target.value as ServiceAreaGroup)} className={fieldClass}><option value="metro_manila">Metro Manila</option><option value="nearby_province">Nearby areas</option></select></label>
                                <label className="grid gap-1 text-xs font-semibold text-[#4a4a4a]">Initial level<select aria-label="Initial coverage level" value={serviceAreaLevel} onChange={(event) => setServiceAreaLevel(event.target.value as ServiceAreaLevel)} className={fieldClass}><option value="on_request">On request</option><option value="covered">Covered</option><option value="not_served">Not served</option></select></label>
                                <button type="button" onClick={addServiceArea} disabled={!serviceAreaToAdd.trim()} className="min-h-11 rounded-xl border border-[#8a6a2f] px-4 text-sm font-semibold text-[#704f1e] disabled:opacity-50 sm:col-span-2">Add location</button>
                            </div>
                            {serviceAreaAddError && <p role="alert" className="text-sm text-red-700">{serviceAreaAddError}</p>}
                            {Object.entries(serviceAreaErrors).filter(([field]) => field.startsWith('service_areas.')).map(([field, message]) => <p key={field} role="alert" className="text-sm text-red-700">{message}</p>)}
                            {serviceAreaErrors.service_areas && <p role="alert" className="text-sm text-red-700">{serviceAreaErrors.service_areas}</p>}
                            <button type="submit" disabled={serviceAreasProcessing} className="min-h-11 w-full rounded-full bg-[#8a6a2f] px-5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 sm:w-auto">{serviceAreasProcessing ? 'Saving…' : 'Save service areas'}</button>
                        </form>
                        </div>}
                    </section>

                    <section id="unavailable-dates" className="scroll-mt-24 rounded-3xl border border-[#e8d7cf] bg-white p-4 shadow-sm sm:p-6">
                        <div className="mb-4 flex items-start gap-3 border-b border-[#f0e2dd] pb-4">
                            <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-[#8a6a2f]" />
                            <div>
                                <h2 className="font-serif text-xl font-bold text-[#1a1a1a]">Unavailable Dates</h2>
                                <p className="mt-1 text-sm text-[#4a4a4a]">{availabilityData.blocked_dates.length ? `${availabilityData.blocked_dates.length} date${availabilityData.blocked_dates.length === 1 ? '' : 's'} blocked` : 'Manage days off and outside appointments'}</p>
                            </div>
                        </div>
                        <p className="mb-3 text-sm leading-6 text-[#4a4a4a]">Clients can’t request or reschedule onto dates you block here.</p>
                        <form onSubmit={handleSaveAvailability} className="space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input aria-label="Date to block" type="date" min={dateInputToday()} value={blockedDateToAdd} onChange={(event) => setBlockedDateToAdd(event.target.value)} className={`${fieldClass} min-w-0 flex-1`} />
                                <button type="button" disabled={!blockedDateToAdd || availabilityData.blocked_dates.includes(blockedDateToAdd) || availabilityData.blocked_dates.length >= 100} onClick={() => { setAvailabilityData('blocked_dates', [...availabilityData.blocked_dates, blockedDateToAdd].sort()); setBlockedDateToAdd(''); }} className="min-h-11 min-w-[104px] shrink-0 whitespace-nowrap rounded-xl border border-[#8a6a2f] px-4 text-sm font-semibold text-[#704f1e] disabled:cursor-not-allowed disabled:border-[#b8b0a4] disabled:bg-[#f1efeb] disabled:text-[#5f5b55]">Block date</button>
                            </div>
                            {availabilityErrors.blocked_dates && <p role="alert" className="text-sm text-red-700">{availabilityErrors.blocked_dates}</p>}
                            {availabilityErrors['blocked_dates.0'] && <p role="alert" className="text-sm text-red-700">{availabilityErrors['blocked_dates.0']}</p>}
                            {availabilityData.blocked_dates.length > 0 ? (
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {availabilityData.blocked_dates.map((date) => (
                                        <li key={date} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#f0e2dd] bg-[#fffcf8] px-3 py-2 text-sm">
                                            <span className="shrink-0 whitespace-nowrap font-medium text-[#292521]">{new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                            <button type="button" onClick={() => setAvailabilityData('blocked_dates', availabilityData.blocked_dates.filter((blockedDate) => blockedDate !== date))} className="shrink-0 whitespace-nowrap rounded px-2 py-1 text-sm font-semibold text-[#7a3028] hover:bg-[#f8eeeb]" aria-label={`Remove blocked date ${date}`}>Remove</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-[#6b625a]">No dates blocked.</p>}
                            <button type="submit" disabled={availabilityProcessing} className="rounded-full bg-[#8a6a2f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60">{availabilityProcessing ? 'Saving…' : 'Save availability'}</button>
                        </form>
                    </section>
                </main>
            </div>
        </>
    );
}
