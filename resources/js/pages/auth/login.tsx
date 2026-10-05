import { Form, Head } from '@inertiajs/react';
import { Mail, Lock } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

const inputClass =
    'pl-9 bg-[#FFFAFB] border-[#F3A6C0] rounded-xl text-[#4A2C33] placeholder:text-[#7A5560]/60 focus-visible:border-[#E75480] focus-visible:ring-[#E75480]/40';

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-[#4A2C33]">
                                    Email address
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E75480]/60" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="email@example.com"
                                        className={inputClass}
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password" className="text-[#4A2C33]">
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm text-[#E75480] hover:text-[#D63F6E]"
                                            tabIndex={5}
                                        >
                                            Forgot your password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E75480]/60 z-10" />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Password"
                                        className={inputClass}
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="border-[#F3A6C0] data-[state=checked]:bg-[#E75480] data-[state=checked]:border-[#E75480]"
                                />
                                <Label htmlFor="remember" className="text-[#4A2C33]">
                                    Remember me
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full rounded-full bg-[#E75480] text-white shadow-md shadow-[#F3A6C0]/50 transition duration-200 hover:bg-[#D63F6E] hover:shadow-lg"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log me in
                            </Button>
                        </div>

                        <div className="text-center text-sm text-[#7A5560]">
                            New to Prishana Aesthetics?{' '}
                            <TextLink href={register()} tabIndex={5} className="text-[#E75480] hover:text-[#D63F6E] font-medium">
                                Create an account
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Welcome back, gorgeous',
    description: "Let's get it started."
};
