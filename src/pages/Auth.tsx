import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAY_BADGES = ['AZVOX', 'ЮMoney'];

const Auth = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regErr, setRegErr] = useState<Record<string, string>>({});

  const [logEmail, setLogEmail] = useState('');
  const [logPass, setLogPass] = useState('');
  const [logErr, setLogErr] = useState<Record<string, string>>({});

  const submitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (regName.trim().length < 2) errs.name = 'Укажите имя';
    if (!emailRe.test(regEmail)) errs.email = 'Некорректный e-mail';
    if (regPass.length < 6) errs.pass = 'Минимум 6 символов';
    setRegErr(errs);
    if (Object.keys(errs).length) return;
    register(regName.trim(), regEmail.trim(), regPass);
    toast.success('Аккаунт создан', { description: 'Добро пожаловать в Php-Skript!' });
    navigate('/cabinet');
  };

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!emailRe.test(logEmail)) errs.email = 'Некорректный e-mail';
    if (logPass.length < 6) errs.pass = 'Минимум 6 символов';
    setLogErr(errs);
    if (Object.keys(errs).length) return;
    login(logEmail.trim(), logPass);
    toast.success('Вход выполнен');
    navigate('/cabinet');
  };

  return (
    <div className="brand-stage flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link to="/" className="mb-8 flex items-center gap-3">
        <img src="/img/logo.png" alt="Php-Skript" className="h-9 w-auto" />
      </Link>

      <div className="w-full max-w-md animate-scale-in rounded-2xl border-[1.5px] border-brand-cyan/40 bg-card/95 p-7 shadow-[0_24px_60px_-30px_hsl(var(--brand-cyan)/0.6)] md:p-9">
        <Tabs defaultValue="register">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="register">Регистрация</TabsTrigger>
            <TabsTrigger value="login">Вход</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <h1 className="mb-1 font-head text-2xl font-bold uppercase tracking-wide text-foreground">
              Создать аккаунт
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Личный кабинет с покупками и историей платежей.
            </p>
            <form onSubmit={submitRegister} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="reg-name">Имя</Label>
                <Input
                  id="reg-name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Как к вам обращаться"
                />
                {regErr.name && <p className="text-xs text-destructive">{regErr.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">E-mail</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                {regErr.email && <p className="text-xs text-destructive">{regErr.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-pass">Пароль</Label>
                <Input
                  id="reg-pass"
                  type="password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  placeholder="Минимум 6 символов"
                />
                {regErr.pass && <p className="text-xs text-destructive">{regErr.pass}</p>}
              </div>
              <button
                type="submit"
                className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Icon name="UserPlus" size={18} />
                Зарегистрироваться
              </button>
            </form>
          </TabsContent>

          <TabsContent value="login">
            <h1 className="mb-1 font-head text-2xl font-bold uppercase tracking-wide text-foreground">
              Вход в кабинет
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Доступ к покупкам, скачиваниям и балансу.
            </p>
            <form onSubmit={submitLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="log-email">E-mail</Label>
                <Input
                  id="log-email"
                  type="email"
                  value={logEmail}
                  onChange={(e) => setLogEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                {logErr.email && <p className="text-xs text-destructive">{logErr.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-pass">Пароль</Label>
                <Input
                  id="log-pass"
                  type="password"
                  value={logPass}
                  onChange={(e) => setLogPass(e.target.value)}
                  placeholder="Ваш пароль"
                />
                {logErr.pass && <p className="text-xs text-destructive">{logErr.pass}</p>}
              </div>
              <button
                type="submit"
                className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Icon name="LogIn" size={18} />
                Войти
              </button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center justify-center gap-2.5 border-t border-border pt-5">
          <span className="text-xs text-muted-foreground">Оплата и выплаты через</span>
          {PAY_BADGES.map((b) => (
            <span
              key={b}
              className="rounded-md border border-brand-cyan/35 px-2.5 py-1 font-head text-xs font-semibold tracking-wide text-brand-cyan"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-cyan"
      >
        <Icon name="ArrowLeft" size={15} />
        На главную
      </Link>
    </div>
  );
};

export default Auth;
