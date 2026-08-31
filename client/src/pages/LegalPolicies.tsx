import { Link } from "wouter";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import terms from "@/content/legal/terms-of-use.md?raw";
import privacy from "@/content/legal/privacy-policy.md?raw";

function inline(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

function PolicyText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const output: ReactNode[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(
      <p key={key++} className="leading-7">
        {inline(paragraph.join(" "))}
      </p>
    );
    paragraph = [];
  };

  const flushBullets = () => {
    if (!bullets.length) return;
    output.push(
      <ul key={key++} className="list-disc space-y-2 pl-6 leading-7">
        {bullets.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }

    if (line === "---") {
      flushParagraph();
      flushBullets();
      output.push(<hr key={key++} className="my-8 border-border" />);
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushBullets();
      output.push(
        <h3 key={key++} className="mt-6 text-lg font-semibold">
          {inline(line.slice(4))}
        </h3>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushBullets();
      output.push(
        <h2 key={key++} className="mt-8 text-xl font-bold">
          {inline(line.slice(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushBullets();
      output.push(
        <h1 key={key++} className="mb-2 text-2xl font-bold">
          {inline(line.slice(2))}
        </h1>
      );
      continue;
    }

    const bullet = raw.match(/^\s*-\s+(.*)$/);

    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1].trim());
      continue;
    }

    if (bullets.length && /^\s+/.test(raw)) {
      bullets[bullets.length - 1] += " " + line;
      continue;
    }

    flushBullets();
    paragraph.push(line);
  }

  flushParagraph();
  flushBullets();

  return <div className="space-y-4">{output}</div>;
}

export default function LegalPolicies() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/">
          <a className="mb-6 inline-block text-sm underline">
            ← Back to CoogsNation
          </a>
        </Link>

        <h1 className="text-3xl font-bold">Terms & Privacy</h1>
        <p className="mb-6 mt-1 text-muted-foreground">
          NGF Productions LLC · CoogsNation.com
        </p>

        <Tabs defaultValue="terms" className="w-full">
          <TabsList>
            <TabsTrigger value="terms">Terms of Use</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="mt-6">
            <PolicyText text={terms} />
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <PolicyText text={privacy} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
