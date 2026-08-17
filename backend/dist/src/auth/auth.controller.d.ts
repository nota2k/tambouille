import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { OidcLoginDto } from './dto/oidc-login.dto';
import { SetUsernameDto } from './dto/set-username.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly authService;
    private readonly passwordResetService;
    constructor(authService: AuthService, passwordResetService: PasswordResetService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            username: string | null;
            displayName: string;
            bio: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            hasPassword: boolean;
            hasGoogle: boolean;
            hasKeycloak: boolean;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            username: string | null;
            displayName: string;
            bio: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            hasPassword: boolean;
            hasGoogle: boolean;
            hasKeycloak: boolean;
        };
    }>;
    google(dto: GoogleLoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            username: string | null;
            displayName: string;
            bio: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            hasPassword: boolean;
            hasGoogle: boolean;
            hasKeycloak: boolean;
        };
    }>;
    linkGoogle(userId: string, dto: GoogleLoginDto): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    oidc(dto: OidcLoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            username: string | null;
            displayName: string;
            bio: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            hasPassword: boolean;
            hasGoogle: boolean;
            hasKeycloak: boolean;
        };
    }>;
    linkOidc(userId: string, dto: OidcLoginDto): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    me(userId: string): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    setUsername(userId: string, dto: SetUsernameDto): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    setPassword(userId: string, dto: SetPasswordDto): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    forgotPassword(dto: ForgotPasswordDto, ip: string): Promise<void>;
    resetPassword(dto: ResetPasswordDto): Promise<void>;
}
