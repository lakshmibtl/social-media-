import './globals.css';

export const metadata = {
  title: 'Nova Engage Prototype',
  description: 'Next-generation workplace community platform',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#eef2f6', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
