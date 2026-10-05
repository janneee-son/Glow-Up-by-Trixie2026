import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { researchextension } from '@/routes';

export default function ResearchExtension() {
    return (
        <>
            <Head title="Research Extension" />
            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Iusto accusantium dignissimos ducimus quos est nam provident esse odio labore nobis sint distinctio nemo eveniet minus dolore repellendus alias, ipsum magni?</p>
        </>
    );
}

ResearchExtension.layout = {
    breadcrumbs: [
        {
            title: 'Research Extension',
            href: researchextension(),
        },
    ],
};
