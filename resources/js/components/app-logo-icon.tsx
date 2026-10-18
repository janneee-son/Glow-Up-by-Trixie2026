import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(
    props: ImgHTMLAttributes<HTMLImageElement>,
) {
    return <img src="/acc-logo.png" alt="ACC Logo" {...props} />;
}
