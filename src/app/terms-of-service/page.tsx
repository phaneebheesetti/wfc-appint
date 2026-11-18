import { type Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
}

export default function TermsOfServicePage() {
  return (
    <div className="overflow-auto">
      <div className="container mx-auto p-4 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Terms of Service</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h3>Privacy Policy</h3>
          <p>
            Protecting your privacy is very important to World&apos;s Finest&reg; Chocolate, Inc. We take the protection
            of your personal information very seriously. This policy is intended to help you understand how we collect,
            use and safeguard the information you provide on our web site.
          </p>

          <h3>Orders</h3>
          <p>
            When you place an order for a product, we need to know your name, email address, mailing address, credit
            card number and expiration date. This information is required so that we can process and fulfill your order,
            and send an order confirmation. All Internet transactions with World&apos;s Finest Chocolate are performed
            on a secure server that encrypts your credit card information to ensure it is not read by unauthorized third
            parties.
          </p>

          <h3>Company Mailing</h3>
          <p>
            When you purchase products online from World&apos;s Finest Chocolate&reg;, request product information or
            otherwise provide us with personal information, we automatically place you on our list to receive
            promotional emails and direct mail catalogs. We also reserve the right to provide your personal contact
            information to non-affiliated third party companies that we have selected to offer you products or services.
            If you do not wish to receive email promotions or catalogs or materials from third parties, you can simply
            respond by telling us that you do not want to receive any future communications or contact our Customer
            Service Department at the contact specified below. Please note that we reserve the right to disclose
            personal information in response to a subpoena or in connection with legal action.
          </p>

          <h3>Policies for Children</h3>
          <p>
            World&apos;s Finest&reg; Chocolate does not knowingly collect or use information from users under 13 years
            of age. No information should be submitted to our site by guests under 13 years of age.
          </p>

          <h3>Browsing Information</h3>
          <p>
            Our site does not use &quot;cookies&quot; to collect or store personal information. We may detect and use
            your IP address or other web site usage information for site administration purposes, however no personal
            information is gathered in connection with such activities.
          </p>

          <h3>Linked Sites</h3>
          <p>
            Please be advised that our web site contains links to third party web sites. The linked sites are not under
            the control of World&apos;s Finest Chocolate, and we are not responsible for the content or privacy
            practices of any linked site or any link on a linked site.
          </p>

          <h3>Personal, Non-Commercial Use</h3>
          <p>
            You are authorized to download one copy of the material on this web site on one computer for your personal,
            non-commercial use only, and to print one hard copy of the material on this web site for your personal,
            non-commercial use only. In doing so, you may not remove or in any way alter any trademark, copyright, or
            other proprietary notice. You may not modify, copy, distribute, republish, commercially exploit, or upload
            any of the material on this web site without the prior written consent of World&apos;s Finest Chocolate,
            except as expressly allowed in the first sentence of this paragraph and except to the extent as may be
            expressly allowed in this web site from time to time in a &quot;send to a friend&quot; or similar feature
            with respect to any particular material on this web site (but in no event may you commercially exploit any
            such material without the prior written consent of World&apos;s Finest Chocolate). No intellectual property
            or other rights in and to this web site, other than the limited right to use set forth above, are
            transferred to you.
          </p>

          <h3>Changes to the Privacy Policy</h3>
          <p>
            World&apos;s Finest Chocolate reserves the right to revise this policy at any time by updating this posting.
            Your use of our web site indicates your agreement to the currently posted privacy policy.
          </p>

          <h3>Security Policy</h3>
          <p>
            WFC will make all reasonable efforts to protect your information. We use the 128-bit Secure Socket Layer
            protocol to protect the security of your online order information. SSL technology encrypts your order
            information to protect it from being decoded by anyone other than World&apos;s Finest&reg; Chocolate.
          </p>

          <p>
            Once you enter the checkout page your computer will begin communicating with our server in secure mode. You
            can tell that you are in secure mode by the following:
          </p>

          <ul>
            <li>The &quot;http&quot; in the web address will be replaced by &quot;https&quot;</li>
            <li>
              Depending on the browser, you will see either a padlock (Microsoft Internet Explorer, Firefox, AOL,
              Netscape Communicator) or a solid key (Netscape Navigator) in the lower section of the browser window. A
              padlock will be displayed in the upper right section of the browser window on Safari.
            </li>
          </ul>

          <p>
            Only browsers that use the 128-bit Secure Socket Layer protocol are able to order through the World&apos;s
            Finest Chocolate website. If your browser does not support SSL, you can get an upgrade at Microsoft&apos;s
            or Firefox&apos;s home page.
          </p>

          <p>
            Your password will be your personal, secret entry code to access your Personal Account at our Site. When you
            access your account information, it is kept on a secure server and a password is needed to access any
            account areas. You can change your password as many times as you like. We recommend that you keep your
            password in a safe place and that you always sign off your account and close your browser window once you
            have finished your visit. These precautions will help prevent someone else from accessing your account,
            especially if you share a computer with other people or use a computer in a public place such as an Internet
            café or library.
          </p>

          <h3>Acceptable Content Guidelines</h3>
          <p>
            To ensure that World&apos;s Finest&reg; Chocolate products can be enjoyed by everyone, there are a few rules
            that we ask everyone to follow.
          </p>

          <p>The content listed below is not permitted on personalized World&apos;s Finest&reg; Chocolate products:</p>

          <ul>
            <li>
              No text or images that infringe on any intellectual property rights including, but not limited to
              copyrights, trademarks and rights of privacy/publicity
            </li>
            <li>No text or images of obscenity, pornography or nudity</li>
            <li>No text or images that encourage or glorify drug use/abuse</li>
            <li>No excessive violence</li>
            <li>No content that is libelous or defamatory</li>
            <li>No content that can reasonably be viewed as harassing, threatening, or otherwise harmful</li>
            <li>No hate speech</li>
            <li>
              No content that can reasonably be viewed as discriminatory based upon race, ethnicity, national origin,
              sexual orientation, gender, gender identity or disability
            </li>
            <li>No content that violates or encourages anyone else to violate any law</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
