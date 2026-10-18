import { Form, Head } from '@inertiajs/react';
import { User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

const inputClass =
    'pl-9 bg-[#fffcf8] border-[#c9a66b] rounded-xl text-[#1a1a1a] placeholder:text-[#4a4a4a]/60 focus-visible:border-[#8a6a2f] focus-visible:ring-[#8a6a2f]/40';

const plainInputClass =
    'bg-[#fffcf8] border-[#c9a66b] rounded-xl text-[#1a1a1a] placeholder:text-[#4a4a4a]/60 focus-visible:border-[#8a6a2f] focus-visible:ring-[#8a6a2f]/40';

// Allow letters (incl. accented), spaces, hyphens, apostrophes only.
const NAME_PATTERN = "^[A-Za-zÀ-ÖØ-öø-ÿ' \\-]+$";
// Allow digits, spaces, and an optional leading +.
const PHONE_PATTERN = '^\\+?[0-9 ]+$';
// Philippine postal codes are 4 digits.
const POSTAL_PATTERN = '^[0-9]{4}$';

/** Blocks a keystroke that doesn't match the allowed character set, before it's typed. */
function blockKeysNotMatching(regex: RegExp) {
    return (e: KeyboardEvent<HTMLInputElement>) => {
        // allow control keys (backspace, tab, arrows, delete, etc.)
        if (e.key.length > 1 || e.ctrlKey || e.metaKey) {
            return;
        }

        if (!regex.test(e.key)) {
            e.preventDefault();
        }
    };
}

const blockNonNameKeys = blockKeysNotMatching(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]$/);
const blockNonDigitKeys = blockKeysNotMatching(/^[0-9+ ]$/);
const blockNonIntegerKeys = blockKeysNotMatching(/^[0-9]$/);

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title="Register" />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="name"
                                    className="text-[#1a1a1a]"
                                >
                                    Name
                                </Label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8a6a2f]/60" />
                                    <Input
                                        id="name"
                                        type="text"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="name"
                                        name="name"
                                        placeholder="Full name"
                                        pattern={NAME_PATTERN}
                                        title="Letters only, no numbers or symbols"
                                        onKeyDown={blockNonNameKeys}
                                        className={inputClass}
                                    />
                                </div>
                                <InputError
                                    message={errors.name}
                                    className="mt-2"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-[#1a1a1a]"
                                >
                                    Email address
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8a6a2f]/60" />
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        tabIndex={2}
                                        autoComplete="email"
                                        name="email"
                                        placeholder="email@example.com"
                                        maxLength={255}
                                        className={inputClass}
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="phone"
                                    className="text-[#1a1a1a]"
                                >
                                    Phone number
                                </Label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8a6a2f]/60" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        tabIndex={3}
                                        autoComplete="tel"
                                        name="phone"
                                        placeholder="09XX XXX XXXX"
                                        inputMode="tel"
                                        pattern={PHONE_PATTERN}
                                        title="Numbers only"
                                        maxLength={15}
                                        onKeyDown={blockNonDigitKeys}
                                        className={inputClass}
                                    />
                                </div>
                                <InputError message={errors.phone} />
                            </div>

                            {/* address */}
                            <div className="grid gap-4 rounded-xl border border-[#c9a66b]/60 bg-[#f4e9e5] p-4">
                                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#8a6a2f] uppercase">
                                    <MapPin className="h-3.5 w-3.5" /> Address
                                </p>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="street_address"
                                        className="text-[#1a1a1a]"
                                    >
                                        House no. / Street
                                    </Label>
                                    <Input
                                        id="street_address"
                                        type="text"
                                        required
                                        tabIndex={4}
                                        autoComplete="address-line1"
                                        name="street_address"
                                        placeholder="e.g. 123 Rizal St."
                                        maxLength={255}
                                        className={plainInputClass}
                                    />
                                    <InputError
                                        message={errors.street_address}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="barangay"
                                            className="text-[#1a1a1a]"
                                        >
                                            Barangay
                                        </Label>
                                        <Input
                                            id="barangay"
                                            type="text"
                                            required
                                            tabIndex={5}
                                            autoComplete="address-level3"
                                            name="barangay"
                                            maxLength={100}
                                            className={plainInputClass}
                                        />
                                        <InputError message={errors.barangay} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="city"
                                            className="text-[#1a1a1a]"
                                        >
                                            City / Municipality
                                        </Label>
                                        <Input
                                            id="city"
                                            type="text"
                                            required
                                            tabIndex={6}
                                            autoComplete="address-level2"
                                            name="city"
                                            maxLength={100}
                                            className={plainInputClass}
                                        />
                                        <InputError message={errors.city} />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="province"
                                            className="text-[#1a1a1a]"
                                        >
                                            Province
                                        </Label>
                                        <Input
                                            id="province"
                                            type="text"
                                            required
                                            tabIndex={7}
                                            autoComplete="address-level1"
                                            name="province"
                                            maxLength={100}
                                            className={plainInputClass}
                                        />
                                        <InputError message={errors.province} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="postal_code"
                                            className="text-[#1a1a1a]"
                                        >
                                            Postal code
                                        </Label>
                                        <Input
                                            id="postal_code"
                                            type="text"
                                            inputMode="numeric"
                                            required
                                            tabIndex={8}
                                            autoComplete="postal-code"
                                            name="postal_code"
                                            placeholder="e.g. 8000"
                                            pattern={POSTAL_PATTERN}
                                            title="4-digit postal code"
                                            maxLength={4}
                                            onKeyDown={blockNonIntegerKeys}
                                            className={plainInputClass}
                                        />
                                        <InputError
                                            message={errors.postal_code}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className="text-[#1a1a1a]"
                                >
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-[#8a6a2f]/60" />
                                    <PasswordInput
                                        id="password"
                                        required
                                        tabIndex={9}
                                        autoComplete="new-password"
                                        name="password"
                                        placeholder="Password"
                                        passwordrules={passwordRules}
                                        className={inputClass}
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password_confirmation"
                                    className="text-[#1a1a1a]"
                                >
                                    Confirm password
                                </Label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-[#8a6a2f]/60" />
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        tabIndex={10}
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Confirm password"
                                        passwordrules={passwordRules}
                                        className={inputClass}
                                    />
                                </div>
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full rounded-full bg-[#8a6a2f] text-white shadow-md shadow-[#c9a66b]/50 transition duration-200 hover:bg-[#735829] hover:shadow-lg"
                                tabIndex={11}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Start my glow-up
                            </Button>
                        </div>

                        <div className="text-center text-sm text-[#4a4a4a]">
                            Already booked with us before?{' '}
                            <TextLink
                                href={login()}
                                tabIndex={12}
                                className="font-medium text-[#8a6a2f] hover:text-[#735829]"
                            >
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Sign Up!',
    description: 'Create an account to start booking your glow-up.',
};
