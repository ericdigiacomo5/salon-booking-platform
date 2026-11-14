export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_MAX_BYTES = 72

export const BCRYPT_COST = 10

export function passwordError(password: unknown): string | null {
    if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    }
    if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
        return `Password is too long (maximum ${PASSWORD_MAX_BYTES} bytes — about ${PASSWORD_MAX_BYTES} plain characters)`
    }
    return null
}
