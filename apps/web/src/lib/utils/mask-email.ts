/**
 * Masks an email address for privacy.
 * Example: john@gmail.com -> j***@gmail.com
 * Example: ab@x.io -> a***@x.io
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email) return "";

    const [local, domain] = email.split("@");
    if (!local || !domain) return email;

    if (local.length <= 1) {
        return `${local}***@${domain}`;
    }

    return `${local[0]}***@${domain}`;
}
