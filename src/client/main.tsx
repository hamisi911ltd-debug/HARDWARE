import { MotionConfig } from "motion/react";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./components/Layout";
import { AuthProvider, QuoteProvider, SiteProvider, ToastProvider } from "./lib/context";
import Home from "./pages/Home";
import { About, Contact, Services } from "./pages/Info";
import { ProductDetail, Shop } from "./pages/Shop";
import "./styles.css";

// Split out so public visitors never download the dashboards.
const Admin = lazy(() => import("./pages/admin/Admin"));

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-20 pt-36 text-center">
      <h1 className="display text-5xl">Page not found</h1>
      <p className="mt-3 text-muted">That page has moved or never existed.</p>
      <Link to="/" className="btn btn-primary mt-6">Back to home</Link>
    </div>
  );
}

const Loading = () => <div className="grid min-h-svh place-items-center text-sm text-muted">Loading...</div>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <SiteProvider>
          <AuthProvider>
            <ToastProvider>
              <QuoteProvider>
                <div className="aurora" aria-hidden="true" />
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route element={<PublicLayout />}>
                      <Route index element={<Home />} />
                      <Route path="shop" element={<Shop />} />
                      <Route path="shop/:slug" element={<ProductDetail />} />
                      <Route path="services" element={<Services />} />
                      <Route path="about" element={<About />} />
                      <Route path="contact" element={<Contact />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                    <Route path="admin/*" element={<Admin />} />
                  </Routes>
                </Suspense>
              </QuoteProvider>
            </ToastProvider>
          </AuthProvider>
        </SiteProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
