import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SupportFab } from "@/components/site/support-fab";
import { CartProvider } from "@/components/cart/cart";
import { CartDrawer } from "@/components/cart/cart-drawer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <SiteHeader />
        {children}
        <SiteFooter />
        <SupportFab />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
