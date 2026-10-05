import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { about } from '@/routes';

export default function About() {
    return (
        <>
            <Head title="About" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">


                    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                        <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                            <div className='relative z-10 flex h-full flex-col items-center justify-center p-6'>
                                <img src="https://accabuyog.com/home/wp-content/uploads/2023/02/ACC-logo-1-5-1536x1536.png" alt="acc logo" 
                                className="mb-4 h-40 w-40 rounded-full object-cover md:h-44 md:w-44"/>
                                <h3 className='text-center text-lg font-bold tracking-tight'>
                                    ACC Official Seal
                                </h3>
                                <p className='mt-1 text-center text-sm text-muted-foreground'>
                                    Abuyog Community College
                                </p>
                            </div>
                        </div>



                    <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className='relative z-10 flex h-full flex-col items-center justify-center p-6'>
                            <img src="https://accabuyog.com/home/wp-content/themes/gwt-wordpress-26.0.0/images/transparency-seal-160x160.png" alt="transparency seal"
                            className="mb-4 h-40 w-40 rounded-full object-cover md:h-44 md:w-44"/>
                            <h3 className='text-center text-lg font-bold tracking-tight'>
                                Transparency Seal
                            </h3>
                            <p className='mt-1 text-center text-sm text-muted-foreground'>
                                Government Transparency Seal
                            </p>
                        </div>

                    </div>


                    <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className='relative z-10 flex h-full flex-col items-center justify-center p-6'>
                            <img src="https://accabuyog.com/home/wp-content/themes/gwt-wordpress-26.0.0/images/foi-logo-160x160.png" alt="freedom of information"
                            className='mb-4 h-40 w-40 rounded-full object-cover md:h-44 md:w-44'/>
                            <h3 className='text-center text-lg font-bold tracking-tight'>
                                Freedom of Information
                            </h3>
                            <p className='mt-1 text-center text-sm text-muted-foreground'>
                                FOI Philippines
                            </p>
                        </div>

                    </div>
                </div>



                <div className="grid auto-rows-min gap-4 md:grid-cols-2">
                     <div className="flex justify-center items-center relative aspect-video rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className="space-y-6 px-5 py-5">
                            <div>
                                <h2 className='text-2xl font-bold tracking-tight'>
                                    ACC OFFICIAL SEAL
                                </h2>
                                {/* introduction */}
                                <div className='space-y-4 text-sm leading-7 text-justify text-muted-foreground'>
                                    <p>
                                        Since its founding on 1979, <strong>Abuyog Community College</strong> has striven to provide students the knowledge, values, skills, and community involvement to enable them to excel as the forefront manpower of community and of the global arena. ACC aims for the creation of a scholastic environment composed of individuals that are grounded in faith, integrity, respect and trust.
                                    </p>
                                    <p>
                                        With today’s fast-paced global progress, ACC promotes and fosters the acquisition of attributes that will empower students to triumph against ignorance and mediocrity and contribute positively to nation building.
                                    </p>
                                </div>
                                <div className='space-y-4'>
                                    <h3 className='mt-6 text-xl font-semibold'>
                                        The School LOGO:
                                    </h3>
                                </div>
                                <ul className='space-y-4 text-sm leading-7 text-justify text-muted-foreground'>
                                    <li>
                                        <strong className='text-foreground'>Laurel Wreath</strong> (Green) – a symbol of victory and honor. It symbolizes ACC’s triumph against ignorance and success in the search for truth and knowledge.
                                    </li>
                                    <li>
                                        <strong className='text-foreground'>Torch</strong> – an emblem of enlightenment and hope. It symbolizes the vision of ACC to provide light as a source of enlightenment to all students.
                                    </li>
                                    <li>
                                        <strong className='text-foreground'>Scrolls</strong> – an emblem of wisdom. It symbolizes translating academic work into meaningful presentations of expertise and scholarly work.
                                    </li>
                                    <li>
                                        <strong className='text-foreground'>Quill Pen and Ink</strong> – an instrument for writing which symbolizes freedom and independence to soar and be able to look at things from a wider perspective.
                                    </li>
                                    <li>
                                        <strong className='text-foreground'>Bee</strong> – symbol for the Municipality of Abuyog, and;
                                    </li>
                                    <li>
                                        <strong className='text-foreground'>1979</strong> the year the college was established.
                                    </li>
                                </ul>
                            </div>
                        </div>
            


                    </div>

                    <div className='space-y-6'>

                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border pt-4 px-4 p-4">
                            
                            <div className='border-b border-sidebar-border/70 px-5 py-4 dark:border-sidebar-border'>
                                <h3 className='text-lg text-semibold'>
                                    About Abuyog Community College
                                </h3>
                                <p className='mt-1 text-sm text-muted-foreground'>
                                    Learn more about ACC and it's mission
                                </p>

                            </div>

                            <div className='relative aspect-video'>
                                <iframe 
                                className='w-full h-full z-10 space-y-4'
                                src="https://www.youtube.com/embed/_dHiZW9oDdw"
                                title="Acc Video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; " allowFullScreen 
                                />
                            
                
                            </div>
                        </div>



                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border pt-4 px-4 p-4">
                            
                            <div className='border-b border-sidebar-border/70 px-5 py-4 dark:border-sidebar-border'>

                                <h3 className='text-lg text-semibold'>
                                    Abuyog Community College Video
                                </h3>
                                <p className='mt-1 text-sm text-muted-foreground'>
                                    Discover more about the institution
                                </p>

                            </div>

                            <div className='relative aspect-video'>
                            <iframe 
                            className='w-full h-full z-10 space-y-4'
                            src="https://www.youtube.com/embed/mCBtWIoT8ts?si=ptk4HgrlTGX9PCzd"
                            title="Acc Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; " allowFullScreen 
                            />
                        
                        
                            </div>
                        </div>


                    </div>

                </div>



            </div>
        </>
    );
}

About.layout = {
    breadcrumbs: [
        {
            title: 'About',
            href: about(),
        },
    ],
};
