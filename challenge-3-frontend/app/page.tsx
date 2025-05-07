import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  LockKeyhole,
  ArrowUpRight,
  Gift,
  Users,
  Shield,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 dark:from-gray-950 dark:to-purple-950/30">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 md:px-10 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text ">
              Secure Token Vesting Platform
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Manage your token allocations with customizable vesting schedules.
              Perfect for teams, investors, and token holders.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/vesting"
                className="flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:opacity-90 transition-opacity"
              >
                Launch Dashboard <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs/vesting"
                className="flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
              >
                Learn More <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/90 to-blue-500/90 flex items-center justify-center">
              <div className="text-white p-8 max-w-xs mx-auto">
                <div className="space-y-3">
                  <div className="h-4 bg-white/30 rounded-full w-3/4"></div>
                  <div className="h-4 bg-white/30 rounded-full"></div>
                  <div className="h-4 bg-white/30 rounded-full w-5/6"></div>
                </div>
                <div className="mt-8 space-y-3">
                  <div className="h-8 bg-white/20 rounded-lg"></div>
                  <div className="h-24 bg-white/10 rounded-lg flex items-center justify-center">
                    <Clock className="h-12 w-12 text-white/50" />
                  </div>
                  <div className="h-8 bg-white/20 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 md:px-10 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Why Choose Our Vesting Solution
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-900">
            <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-4">
              <LockKeyhole className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Secure Locking</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Lock tokens securely with smart contracts for predefined time
              periods. Guaranteed by blockchain security.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-900">
            <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Flexible Schedules</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Create custom vesting schedules with cliff periods, linear
              vesting, or milestone-based releases.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-900">
            <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Team Management</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Easily manage token allocations for team members, investors, and
              advisors with role-based permissions.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 px-6 md:px-10 max-w-6xl mx-auto mb-10">
        <div className="bg-gradient-to-r from-purple-600/90 to-blue-500/90 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-8 py-12 md:p-12 text-white">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to manage your token vesting?
              </h2>
              <p className="text-white/80 mb-8">
                Set up your first vesting schedule in minutes and start managing
                token distributions with ease.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/vesting"
                  className="px-6 py-3 font-medium rounded-lg bg-white text-purple-600 hover:bg-white/90 transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  href="/docs"
                  className="px-6 py-3 font-medium rounded-lg border border-white/30 hover:bg-white/10 transition-colors"
                >
                  View Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-purple-100 dark:border-purple-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-lg">
                Token Vesting Platform
              </span>
            </div>

            <div className="flex gap-6 flex-wrap items-center justify-center">
              <a
                className="flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                href="/docs/vesting"
              >
                <Image
                  aria-hidden
                  src="https://nextjs.org/icons/file.svg"
                  alt="Documentation icon"
                  width={16}
                  height={16}
                />
                Documentation
              </a>
              <a
                className="flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                href="/support"
              >
                <Image
                  aria-hidden
                  src="https://nextjs.org/icons/window.svg"
                  alt="Support icon"
                  width={16}
                  height={16}
                />
                Support
              </a>
              <a
                className="flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                href="https://openguild.wtf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  aria-hidden
                  src="https://nextjs.org/icons/globe.svg"
                  alt="Globe icon"
                  width={16}
                  height={16}
                />
                OpenGuild →
              </a>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left mt-6">
            Maintained by{" "}
            <a
              className="text-purple-600 dark:text-purple-400 hover:underline"
              href="https://buildstation.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              buildstation.org
            </a>{" "}
            with support from{" "}
            <a
              className="text-purple-600 dark:text-purple-400 hover:underline"
              href="https://openguild.wtf"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenGuild
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
