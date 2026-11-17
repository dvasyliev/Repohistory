import { Navbar } from "@/app/components/layout/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="w-full">
        {children}
      </div>
    </>
  );
}
