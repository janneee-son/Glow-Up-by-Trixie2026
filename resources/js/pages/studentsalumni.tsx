import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import {studentsalumni} from '@/routes';

export default function StudentsAlumni() {
    return (
        <>
            <Head title="Students Alumni" />
            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Debitis libero magnam eos fuga, vel necessitatibus amet vitae in ducimus nobis? Perferendis animi eaque vitae repellat consectetur ab iure soluta totam!</p>
        </>
    );
}

StudentsAlumni.layout = {
    breadcrumbs: [
        {
            title: 'Students Alumni',
            href: studentsalumni(),
        },
    ],
};
