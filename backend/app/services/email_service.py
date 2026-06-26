import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config.settings import settings


def _send_email_sync(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise RuntimeError(
            "Email is not configured. Set SMTP_USER and SMTP_PASSWORD in backend/.env "
            "(use a Gmail App Password)."
        )

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.EMAIL_FROM or settings.SMTP_USER
    message["To"] = to_email
    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(message["From"], [to_email], message.as_string())


async def send_verification_email(to_email: str, username: str, verification_url: str) -> None:
    subject = "Verify your BlockLend account"
    text_body = (
        f"Hi {username},\n\n"
        f"Thanks for registering with BlockLend. Please verify your email by opening this link:\n"
        f"{verification_url}\n\n"
        f"This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.\n\n"
        f"If you did not create an account, you can ignore this email."
    )
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
        <h2>Verify your BlockLend account</h2>
        <p>Hi {username},</p>
        <p>Thanks for registering with BlockLend. Click the button below to verify your email address.</p>
        <p>
          <a href="{verification_url}"
             style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:<br><a href="{verification_url}">{verification_url}</a></p>
        <p>This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.</p>
        <p>If you did not create an account, you can ignore this email.</p>
      </body>
    </html>
    """

    await asyncio.to_thread(_send_email_sync, to_email, subject, html_body, text_body)
