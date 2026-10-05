import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { academe } from '@/routes';

export default function Academe() {
    return (
        <>
            <Head title="Academe" />
             <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Placeat maiores adipisci ipsum sed ratione ipsa voluptates porro modi debitis officia, facere totam fuga magnam corporis, aliquam cupiditate doloribus nihil repellendus!</p>
        </>
    );
}

Academe.layout = {
    breadcrumbs: [
        {
            title: 'Academe',
            href: academe(),
        },
    ],
};
