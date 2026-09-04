import type { ReactNode } from "react";
import { Link } from "wouter";
import { FORUM_NAVIGATION, forumCategoryPath } from "@/lib/forumNavigation";

export function Footer() {
  return (
    <footer className="mt-16 bg-uh-black py-12 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-uh-red">
                <span className="font-bold text-white">CN</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">CoogsNation</h3>
                <p className="text-sm text-gray-300">Houston Cougar Community</p>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              An independent online community for University of Houston fans, students, alumni, and supporters.
            </p>
          </div>

          <FooterSection title="Community">
            <FooterLink href="/forums">Forums</FooterLink>
            <FooterLink href="/coogpaws-chat">Coog Paws Lounge</FooterLink>
            <FooterLink href={forumCategoryPath(FORUM_NAVIGATION.waterCooler.slug)}>Water Cooler</FooterLink>
            <FooterLink href="/members">Members</FooterLink>
            <FooterLink href="/events">Events</FooterLink>
          </FooterSection>

          <FooterSection title="Sports">
            <FooterLink href={forumCategoryPath(FORUM_NAVIGATION.football.slug)}>Football</FooterLink>
            <FooterLink href={forumCategoryPath(FORUM_NAVIGATION.basketball.slug)}>Basketball</FooterLink>
            <FooterLink href={forumCategoryPath(FORUM_NAVIGATION.baseball.slug)}>Baseball</FooterLink>
            <FooterLink href={forumCategoryPath(FORUM_NAVIGATION.recruiting.slug)}>Recruiting</FooterLink>
            <li>
              <a
                href="https://uhcougars.com/calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 transition-colors hover:text-white"
              >
                Official schedules
              </a>
            </li>
          </FooterSection>

          <FooterSection title="Resources">
            <FooterLink href="/news">News</FooterLink>
            <FooterLink href="/store">Store</FooterLink>
            <FooterLink href="/messages">Messages</FooterLink>
            <FooterLink href="/life-happens">Support</FooterLink>
            <FooterLink href="/terms">Terms and privacy</FooterLink>
          </FooterSection>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between border-t border-gray-700 pt-8 md:flex-row">
          <p className="text-sm text-gray-400">
            © 2026 NGF Productions LLC. All rights reserved.<br />CoogsNation is an independent fan site owned and operated by NGF Productions LLC and is not affiliated with, endorsed by, sponsored by, or officially connected with the University of Houston.
          </p>
          <p className="mt-2 text-sm text-gray-400 md:mt-0">Whose House? Coogs&apos; House! 🐾</p>
        </div>
      </div>
    </footer>
  );
}

function FooterSection(props: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-4 font-semibold">{props.title}</h4>
      <ul className="space-y-2 text-sm">{props.children}</ul>
    </div>
  );
}

function FooterLink(props: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={props.href} className="text-gray-300 transition-colors hover:text-white">
        {props.children}
      </Link>
    </li>
  );
}
