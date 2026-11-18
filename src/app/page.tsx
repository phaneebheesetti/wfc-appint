import Image from "next/image"
import Link from "next/link"

import { Home as HomeComponent } from "@/components/home"
import { APP_NAME, WFC_LONG_NAME } from "@/constants/app"

export default function Home() {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div className="flex flex-col gap-4 min-h-screen w-full justify-between items-center p-4">
        <div />

        <div className="flex flex-col gap-4 items-center">
          <Image src="/logo/wfc-logo.png" alt={`${APP_NAME} logo`} width={550} height={197} />
          <h1 className="sr-only">{APP_NAME}</h1>

          <HomeComponent />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-2 text-base text-muted-foreground">
          <Link href="/terms-of-service" target="_blank" rel="noreferrer" className="hover:underline">
            Terms of Service
          </Link>
          <span className="hidden md:block">|</span>
          <Link href="/privacy-policy" target="_blank" rel="noreferrer" className="hover:underline">
            Privacy Policy
          </Link>
          <span className="hidden md:block">|</span>
          <a href="mailto:support@wfchocolate.com" className="hover:underline">
            Contact Support
          </a>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 p-4 py-32">
        <div className="container flex flex-col items-center gap-16">
          <p className="text-center text-lg">
            World’s Finest® Chocolate is the sweetest way to bring profit to your organization and smiles to your
            community. We pride ourselves in providing the easiest fundraising program in the shortest amount of time.
            We continue to lead the fundraising industry with our premium quality chocolate products and programs. We
            provide the best value in fundraising and are committed to helping you achieve your fundraising goals. Are
            you ready to plan a successful fundraiser?
          </p>

          <Image
            src="/landing-page/hero-image-1.png"
            alt={`Three scenes at ${WFC_LONG_NAME}: a group of women smiling for a photo, employees in lab coats touring a facility, and staff enjoying a meal together at a decorated table`}
            width={890}
            height={225}
          />

          <h2 className="text-3xl text-center font-semibold">About World’s Finest® Chocolate</h2>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h3 className="text-2xl font-medium">Making delicious chocolate for three generations</h3>
              <br />
              <p>
                Since 1939, World’s Finest® Chocolate has crafted premium chocolate directly from the cocoa bean. By
                using only the finest raw ingredients and our unique family recipe, we ensure that every piece will
                satisfy your chocolate cravings.
                <br />
                <br />
                Chocolate Gifts World’s Finest® developed our gift offerings from the 1960s through the 1980s, selling
                to corporations around Chicago who gave our chocolate as gifts to their employees and customers. Many of
                our gift products can be personalized, making your gift extra special.
                <br />
                <br /> Retail In 2006, World’s Finest® Chocolate acquired Queen Anne® from a cherry processor in
                Michigan. Since then, the classic good taste of America’s #1 Cherry Cordials has been made from our
                Chicago headquarters.
                <br />
                <br />
                Fundraising Our founder, Ed Opler, Sr., pioneered chocolate product fundraising, starting with our first
                customer: Zion High School. Just outside of the city of Chicago, the Zion HS band was the first group
                ever to do commercialized product fundraising. Since 1949, we’ve helped our customers raise over
                $4,600,000,000!
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <Image
                src="/landing-page/hero-image-2.jpg"
                alt="Black and white photo of an older man in a suit smiling and standing beside a conveyor belt with rows of chocolate bars in a chocolate factory."
                width={600}
                height={500}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex items-center justify-center">
              <Image
                src="/landing-page/hero-image-3.png"
                alt={`Banner with ${WFC_LONG_NAME} logo, the text 'Still the One making FUNdraising fun!', and playful school-themed doodles like a backpack, basketball, graduation cap, ruler, and science icons on a purple and red background`}
                width={1000}
                height={375}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-medium">
                Our Mission: To Deliver Extraordinary Value with Fun and Purpose.
              </h3>
              <br />
              <p>
                Delivering Extraordinary Value with Fun and Purpose is what our employees aim to do every day. Our
                shared values include making delicious chocolate from our family recipe; providing high-quality,
                affordable products; offering fundraising solutions that are easy to execute; servicing our customers
                well; and working safely. It’s definitely fun to make chocolate, and it’s even more fun to make
                chocolate that makes a difference.
                <br />
                <br />
                Whether you remember World’s Finest® Chocolate from fundraising as a kid, as a gift given with love, or
                are trying our chocolate for the first time, we happily welcome you as a part of our cherished family
                tradition.
              </p>
            </div>
          </div>

          <h2 className="text-3xl text-center font-semibold">About Fundraising App</h2>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">How it works</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create or join a fundraiser campaign for your school, team, or organization.</li>
                <li>Distribute chocolate cases and track inventory, checkouts, and deliveries in real time.</li>
                <li>Collect payments securely online via Stripe—cashless, fast, and auditable.</li>
                <li>Monitor sales progress, leaderboards, and prize eligibility from your dashboard.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">Customer service</h3>
              <p>
                For questions or support, contact our team at{" "}
                <a href="mailto:support@wfchocolate.com" className="underline">
                  support@wfchocolate.com
                </a>
                . We typically respond within 1–2 business days.
              </p>
              <p>
                Our services are designed for organizations running chocolate fundraising programs. If you are a
                participant or parent and need help with a specific campaign, please include your organization name and
                campaign details so we can assist you faster.
              </p>
            </div>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">Returns</h3>
              <p>
                For physical goods distributed through fundraising campaigns, returns are coordinated by the hosting
                organization and/or sales representative. If you received a damaged or incorrect product, please contact
                us at{" "}
                <a href="mailto:support@wfchocolate.com" className="underline">
                  support@wfchocolate.com
                </a>{" "}
                within 14 days of delivery and we will work with the organization to make it right.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">Refunds & disputes</h3>
              <p>
                If you made a payment in error or have a charge concern, email{" "}
                <a href="mailto:support@wfchocolate.com" className="underline">
                  support@wfchocolate.com
                </a>{" "}
                within 14 days. Eligible refunds are processed to the original payment method. Disputes are handled in
                accordance with our Terms of Service and card network rules.
              </p>
            </div>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">Cancellation policy</h3>
              <p>
                We do not offer subscriptions. Campaigns can be closed at any time by organization administrators. If a
                payment needs to be canceled before fulfillment, please contact support immediately.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">Legal/export restrictions</h3>
              <p>
                Our platform is intended for use in regions where our fundraising programs are available. We do not ship
                or sell products directly to consumers through this site; fulfillment is coordinated by participating
                organizations and their sales representatives. Any promotions are void where prohibited.
              </p>
            </div>
          </div>

          <div className="w-full space-y-2">
            <h3 className="text-2xl font-semibold">Promotions terms</h3>
            <p>
              From time to time, organizations may run incentives or promotions for participants. Unless otherwise
              stated, promotions cannot be combined, are non-transferable, and have no cash value. Specific terms will
              be displayed alongside each promotion.
            </p>
            <p>
              See our{" "}
              <Link href="/terms-of-service" target="_blank" rel="noreferrer" className="underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" target="_blank" rel="noreferrer" className="underline">
                Privacy Policy
              </Link>{" "}
              for full details.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
