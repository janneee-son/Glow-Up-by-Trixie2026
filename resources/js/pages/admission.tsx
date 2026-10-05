import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { admission } from '@/routes';

export default function Admission() {
    return (
        <>
            <Head title="Admission" />
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Iure, quaerat eaque soluta pariatur consectetur incidunt aperiam, qui facilis nam, nobis dolor quod mollitia cupiditate molestiae suscipit hic ea nemo! Consequuntur?</p>
        </>
    );
}

Admission.layout = {
    breadcrumbs: [
        {
            title: 'Admission',
            href: admission(),
        },
    ],
};
