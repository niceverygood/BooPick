import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "hsl(var(--boopick-cream))" }}
    >
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="flex flex-col items-center gap-3 p-8">
          <h1
            className="text-5xl font-bold tracking-tight sm:text-6xl"
            style={{ color: "hsl(var(--boopick-navy))" }}
          >
            부픽 (BooPick)
          </h1>
          <p className="text-lg text-slate-500">셋업 완료</p>
        </CardContent>
      </Card>
    </main>
  );
}
