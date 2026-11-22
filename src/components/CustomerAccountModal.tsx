import { FormEvent, useEffect, useState } from 'react';
import { LockKeyhole, UserRound, X } from 'lucide-react';
import {
  CustomerProfile,
  registerCustomer,
  signInCustomer,
} from '../services/customerRepository';
import { signInAdmin } from '../services/adminRepository';

type AccountMode = 'login' | 'register' | 'admin';

interface CustomerAccountModalProps {
  isOpen: boolean;
  customer: CustomerProfile | null;
  onClose: () => void;
  onCustomerAuthenticated: (profile: CustomerProfile) => Promise<void> | void;
  onOpenOrders: () => void;
  onSignOut: () => Promise<void>;
  onAdminAuthenticated: () => Promise<void> | void;
}

const REGISTRATION_FIELDS = [
  { key: 'fullName', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Minh Anh' },
  { key: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: '0912 345 678' },
  { key: 'address', label: 'Địa chỉ nhận hàng', type: 'text', placeholder: 'Số nhà, đường, phường/xã, quận/huyện' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'ban@example.com' },
  { key: 'password', label: 'Mật khẩu', type: 'password', placeholder: 'Ít nhất 6 ký tự' },
] as const;

function getErrorMessage(
  error: unknown,
  context: 'registration' | 'general' = 'general'
): string {
  const errorCode =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  if (error instanceof Error) {
    if (
      error.message.includes('Missing or insufficient permissions') ||
      errorCode === 'permission-denied'
    ) {
      if (context === 'registration') {
        return 'Firebase Authentication đã tạo tài khoản nhưng Firestore chưa lưu được hồ sơ. Hãy publish firestore.rules, rồi bấm Tạo tài khoản lại bằng đúng email và mật khẩu vừa nhập.';
      }
      return 'Firestore Rules từ chối yêu cầu. Kiểm tra Rules đã được publish và cấp đúng quyền cho hồ sơ customers/{uid} hoặc tài khoản quản trị admins/{uid}.';
    }
    if (error.message.includes('Firebase: Error (auth/')) {
      if (error.message.includes('auth/email-already-in-use')) {
        return 'Email này đã được đăng ký. Hãy đăng nhập thay vì tạo tài khoản mới.';
      }
      if (error.message.includes('auth/invalid-credential')) {
        return 'Email hoặc mật khẩu không chính xác.';
      }
      if (error.message.includes('auth/weak-password')) {
        return 'Mật khẩu cần có ít nhất 6 ký tự.';
      }
      if (error.message.includes('auth/invalid-email')) {
        return 'Địa chỉ email chưa hợp lệ.';
      }
    }
    return error.message;
  }
  return 'Không thể thực hiện yêu cầu. Vui lòng thử lại.';
}

export function CustomerAccountModal({
  isOpen,
  customer,
  onClose,
  onCustomerAuthenticated,
  onOpenOrders,
  onSignOut,
  onAdminAuthenticated,
}: CustomerAccountModalProps) {
  const [mode, setMode] = useState<AccountMode>('login');
  const [registrationStep, setRegistrationStep] = useState(0);
  const [registration, setRegistration] = useState({
    fullName: '',
    phone: '',
    address: '',
    email: '',
    password: '',
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setBusy(false);
    setMode('login');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateRegistrationStep = (): boolean => {
    const value = registration[REGISTRATION_FIELDS[registrationStep].key].trim();
    if (!value) {
      setError(`Vui lòng nhập ${REGISTRATION_FIELDS[registrationStep].label.toLowerCase()}.`);
      return false;
    }
    if (registrationStep === 1 && !/^(0|\+84)\d{8,10}$/.test(value.replace(/\s+/g, ''))) {
      setError('Số điện thoại Việt Nam chưa hợp lệ.');
      return false;
    }
    if (registrationStep === 3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Địa chỉ email chưa hợp lệ.');
      return false;
    }
    if (registrationStep === 4 && registration.password.length < 6) {
      setError('Mật khẩu cần có ít nhất 6 ký tự.');
      return false;
    }
    setError('');
    return true;
  };

  const handleRegistrationContinue = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateRegistrationStep()) return;
    if (registrationStep < REGISTRATION_FIELDS.length - 1) {
      setRegistrationStep((step) => step + 1);
      return;
    }

    setBusy(true);
    try {
      const profile = await registerCustomer(registration);
      await onCustomerAuthenticated(profile);
    } catch (registrationError) {
      setError(getErrorMessage(registrationError, 'registration'));
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const profile = await signInCustomer(email, password);
      await onCustomerAuthenticated(profile);
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  };

  const handleAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInAdmin(adminEmail, adminPasswordInput);
      await onAdminAuthenticated();
    } catch (adminError) {
      setError(getErrorMessage(adminError));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (nextMode: AccountMode) => {
    setMode(nextMode);
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2018]/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tài khoản khách hàng và quản trị"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-[#E2D7C6] bg-[#FCF9F5] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E2D7C6] bg-[#F8F4EE] px-6 py-4">
          <div className="flex items-center gap-2.5">
            {mode === 'admin' ? (
              <LockKeyhole className="h-4 w-4 text-[#073D63]" />
            ) : (
              <UserRound className="h-4 w-4 text-[#073D63]" />
            )}
            <h2 className="font-semibold text-[#2B2018]">
              {customer ? 'Tài khoản của tôi' : mode === 'admin' ? 'Đăng nhập quản trị' : 'Tài khoản khách hàng'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng tài khoản"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2D7C6] text-[#2B2018] hover:bg-[#EFE8DD]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {customer && mode !== 'admin' ? (
          <div className="space-y-5 p-6">
            <div>
              <p className="text-lg font-semibold text-[#2B2018]">{customer.fullName}</p>
              <p className="mt-1 text-sm text-[#5E4B3C]">{customer.phone}</p>
              <p className="text-sm text-[#5E4B3C]">{customer.email}</p>
              <p className="mt-1 text-sm text-[#867363]">{customer.address}</p>
            </div>
            <button
              type="button"
              onClick={onOpenOrders}
              className="w-full rounded-lg bg-[#073D63] px-4 py-2.5 text-sm font-medium text-[#FCF9F5] hover:bg-[#5E3A1F]"
            >
              Sản phẩm đã mua &amp; theo dõi đơn hàng
            </button>
            <button
              type="button"
              onClick={() => {
                void onSignOut().catch((signOutError: unknown) =>
                  setError(getErrorMessage(signOutError))
                );
              }}
              className="w-full rounded-lg border border-[#E2D7C6] px-4 py-2.5 text-sm font-medium text-[#5E4B3C] hover:bg-[#EFE8DD]"
            >
              Đăng xuất
            </button>
            <button
              type="button"
              onClick={() => switchMode('admin')}
              className="w-full border-t border-[#EFE8DD] pt-3 text-xs text-[#867363] hover:text-[#073D63]"
            >
              Đăng nhập quản trị viên
            </button>
          </div>
        ) : mode === 'register' ? (
          <form onSubmit={handleRegistrationContinue} className="space-y-5 p-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-[#867363]">
                <span>Đăng ký tài khoản</span>
                <span>Bước {registrationStep + 1}/{REGISTRATION_FIELDS.length}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#EFE8DD]">
                <div
                  className="h-full bg-[#073D63] transition-all"
                  style={{ width: `${((registrationStep + 1) / REGISTRATION_FIELDS.length) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#5E4B3C]">
                {REGISTRATION_FIELDS[registrationStep].label}
              </label>
              <input
                autoFocus
                required
                type={REGISTRATION_FIELDS[registrationStep].type}
                value={registration[REGISTRATION_FIELDS[registrationStep].key]}
                onChange={(event) => {
                  const key = REGISTRATION_FIELDS[registrationStep].key;
                  setRegistration((form) => ({ ...form, [key]: event.target.value }));
                  setError('');
                }}
                placeholder={REGISTRATION_FIELDS[registrationStep].placeholder}
                className="w-full rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] px-3.5 py-2.5 text-sm text-[#2B2018] focus:border-[#073D63] focus:outline-none"
              />
            </div>
            {error && <p role="alert" className="text-sm text-[#9E3B2B]">{error}</p>}
            <div className="flex gap-2">
              {registrationStep > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationStep((step) => step - 1);
                    setError('');
                  }}
                  className="flex-1 rounded-lg border border-[#E2D7C6] px-4 py-2.5 text-sm font-medium text-[#5E4B3C]"
                >
                  Quay lại
                </button>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-lg bg-[#073D63] px-4 py-2.5 text-sm font-medium text-[#FCF9F5] disabled:opacity-60"
              >
                {busy ? 'Đang tạo tài khoản...' : registrationStep === REGISTRATION_FIELDS.length - 1 ? 'Tạo tài khoản' : 'Tiếp tục'}
              </button>
            </div>
            <button type="button" onClick={() => switchMode('login')} className="w-full text-sm text-[#073D63] hover:underline">
              Đã có tài khoản? Đăng nhập
            </button>
          </form>
        ) : mode === 'admin' ? (
          <form onSubmit={handleAdminLogin} className="space-y-4 p-6">
            <p className="text-sm text-[#5E4B3C]">
              Đăng nhập bằng tài khoản Firebase đã được cấp quyền quản trị.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#5E4B3C]">Email quản trị</label>
              <input
                autoFocus
                required
                type="email"
                autoComplete="username"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                className="w-full rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#5E4B3C]">Mật khẩu</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={adminPasswordInput}
                onChange={(event) => setAdminPasswordInput(event.target.value)}
                className="w-full rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] px-3.5 py-2.5 text-sm"
              />
            </div>
            {error && <p role="alert" className="text-sm text-[#9E3B2B]">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#073D63] px-4 py-2.5 text-sm font-medium text-[#FCF9F5] disabled:opacity-60">
              {busy ? 'Đang xác thực...' : 'Mở trang quản trị'}
            </button>
            <button type="button" onClick={() => switchMode('login')} className="w-full text-sm text-[#073D63] hover:underline">
              Quay lại tài khoản khách hàng
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 p-6">
            <p className="text-sm text-[#5E4B3C]">Đăng nhập để lưu thông tin nhận hàng và theo dõi đơn mua.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#5E4B3C]">Email</label>
              <input
                autoFocus
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#5E4B3C]">Mật khẩu</label>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] px-3.5 py-2.5 text-sm"
              />
            </div>
            {error && <p role="alert" className="text-sm text-[#9E3B2B]">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#073D63] px-4 py-2.5 text-sm font-medium text-[#FCF9F5] disabled:opacity-60">
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <button type="button" onClick={() => switchMode('register')} className="w-full text-sm text-[#073D63] hover:underline">
              Chưa có tài khoản? Đăng ký lần lượt từng thông tin
            </button>
            <button type="button" onClick={() => switchMode('admin')} className="w-full border-t border-[#EFE8DD] pt-3 text-xs text-[#867363] hover:text-[#073D63]">
              Đăng nhập quản trị viên
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
