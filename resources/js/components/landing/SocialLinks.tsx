const FacebookIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z" />
    </svg>
);

const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.8c-1.4.1-2.6-.3-3.8-1v6.1c0 3.9-3.3 6-6.3 5-2.5-.9-4.1-3.4-3.5-6.1.5-2.4 2.8-4.1 5.3-3.8v2.9c-.4-.1-.8-.1-1.2 0-1 .3-1.6 1.3-1.3 2.3.3 1 1.4 1.6 2.4 1.3.9-.2 1.5-1 1.5-1.9V3h3z" />
    </svg>
);

const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
);

const PhoneIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6.6 3.5h2.7l1.3 3.6-1.7 1.3a11 11 0 0 0 5.7 5.7l1.3-1.7 3.6 1.3v2.7c0 1-.8 1.8-1.8 1.8C10.4 18.2 5.8 13.6 4.8 5.3c0-1 .8-1.8 1.8-1.8z" />
    </svg>
);

export const SOCIALS: {
    facebook: string;
    tiktok: string;
    instagram: string | null;
    phone: string;
} = {
    facebook: 'https://www.facebook.com/glowupbytrixieph',
    tiktok: 'https://www.tiktok.com/@glowupbytrixie111',
    instagram: null, // add her Instagram URL here if she has one
    phone: '09241013301',
};

type Props = {
    /** 'light' on ivory/white backgrounds, 'dark' on ink/photo backgrounds */
    variant?: 'light' | 'dark';
    showPhone?: boolean;
    className?: string;
};

export default function SocialLinks({ variant = 'light', showPhone = false, className = '' }: Props) {
    const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

    return (
        <nav className={`gl-social gl-social--${variant} ${className}`} aria-label="Trixie on social media">
            <a href={SOCIALS.facebook} {...external}>
                <FacebookIcon /> Facebook
            </a>
            <a href={SOCIALS.tiktok} {...external}>
                <TikTokIcon /> TikTok
            </a>
            {SOCIALS.instagram && (
                <a href={SOCIALS.instagram} {...external}>
                    <InstagramIcon /> Instagram
                </a>
            )}
            {showPhone && (
                <a href={`tel:${SOCIALS.phone}`}>
                    <PhoneIcon /> {SOCIALS.phone}
                </a>
            )}
        </nav>
    );
}
