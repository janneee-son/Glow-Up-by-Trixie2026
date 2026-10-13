import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';

export type Slide = { src: string; alt: string; caption: string };

const SLIDES: Slide[] = [
    { src: '/images/landing/slide-setup.webp', caption: 'The setup', alt: 'Trixie applying brow product to a client seated in a makeup chair.' },
    { src: '/images/landing/slide-details.webp', caption: 'Details matter', alt: 'Close-up of eyeshadow being blended using a Dior palette.' },
    { src: '/images/landing/slide-final-touches.webp', caption: 'Final touches', alt: 'Applying lash and liner on a client with glossy waves and a warm glam look.' },
    { src: '/images/landing/slide-glowing.webp', caption: 'Still you, just glowing', alt: 'Trixie photographing a client in a peach dress after her makeup.' },
    { src: '/images/landing/slide-more1.webp', caption: 'Hair and makeup, one chair', alt: 'Trixie styling a client’s loose waves after finishing her makeup.' },
    { src: '/images/landing/slide-more2.webp', caption: 'Every detail in place', alt: 'Trixie adjusting a client’s necklace before photos, in a white off-shoulder gown with a sleek updo.' },
    { src: '/images/landing/slide-more3.webp', caption: 'Lights, mirrors, ready', alt: 'Trixie working at her kit table under studio lights.' },
    { src: '/images/landing/slide-more4.webp', caption: 'Studio vibes', alt: 'Trixie applying makeup in a retro studio with a lit vanity mirror and her Glow Up by Trixie kit table.' },
    { src: '/images/landing/slide-more5.webp', caption: 'Brows, framed', alt: 'Trixie shaping a client’s brow with a fine brush while she wears a red halter dress.' },
    { src: '/images/landing/slide-more6.webp', caption: 'Soft waves, steady hands', alt: 'Trixie styling a client’s long wavy hair by a bright window.' },
    { src: '/images/landing/slide-more7.webp', caption: 'Capturing the process', alt: 'A camera recording a makeup session in progress.' },
    { src: '/images/landing/slide-more8.webp', caption: 'Little ones glow too', alt: 'A smiling young client in a floral blazer while her hair is dried and styled.' },
    

    
];

const AUTOPLAY_MS = 5000;

export default function BehindTheGlow({ slides = SLIDES }: { slides?: Slide[] }) {
    const n = slides.length;
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const startX = useRef<number | null>(null);

    const go = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);
    const next = useCallback(() => go(active + 1), [active, go]);
    const prev = useCallback(() => go(active - 1), [active, go]);

    useEffect(() => {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (paused || reduce || n < 2) return;
        const t = setTimeout(next, AUTOPLAY_MS);
        return () => clearTimeout(t);
    }, [active, paused, next, n]);

    const half = Math.floor(n / 2);
    const rel = (i: number) => ((i - active + n + half) % n) - half;

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        startX.current = e.clientX;
    };
    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    };
    const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
    };

    return (
        <section
            id="behind-the-glam"
            className="gl-slider scroll-mt-20"
            aria-roledescription="carousel"
            aria-label="Behind the scenes with Trixie"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            onKeyDown={onKeyDown}
        >
            <img className="gl-slider__backdrop" src={slides[active].src} alt="" aria-hidden="true" />

            <div className="gl-slider__head">
                <h2 className="gl-slider__title">Behind the glam</h2>
                <p className="gl-slider__sub">
                    A look at how every session comes together, from the first brush stroke to the final photo.
                </p>
            </div>

            <div className="gl-slider__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
                {slides.map((s, i) => {
                    const r = rel(i);
                    const a = Math.abs(r);
                    const style = {
                        '--rel': r,
                        '--scale': r === 0 ? 1 : 0.84,
                        '--op': a > 1 ? 0 : r === 0 ? 1 : 0.7,
                        '--bright': r === 0 ? 1 : 0.85,
                        '--z': 10 - a,
                        pointerEvents: a > 1 ? 'none' : 'auto',
                    } as CSSProperties;

                    return (
                        <figure
                            key={s.src}
                            className="gl-slider__card"
                            data-active={r === 0}
                            aria-hidden={r !== 0}
                            style={style}
                            onClick={() => r !== 0 && go(i)}
                        >
                            <img src={s.src} alt={s.alt} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
                        </figure>
                    );
                })}
            </div>

            <p className="gl-slider__caption" aria-live="polite">
                {slides[active].caption}
            </p>

            <div className="gl-slider__controls">
                <button type="button" className="gl-slider__arrow" onClick={prev} aria-label="Previous photo">
                    ‹
                </button>
                <div className="gl-slider__dots">
                    {slides.map((s, i) => (
                        <button
                            key={s.src}
                            type="button"
                            className="gl-slider__dot"
                            aria-label={`Show photo ${i + 1}`}
                            aria-current={i === active}
                            onClick={() => go(i)}
                        />
                    ))}
                </div>
                <button type="button" className="gl-slider__arrow" onClick={next} aria-label="Next photo">
                    ›
                </button>
            </div>
        </section>
    );
}
