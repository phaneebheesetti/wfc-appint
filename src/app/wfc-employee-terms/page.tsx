import { type Metadata } from "next"

export const metadata: Metadata = {
  title: "WFC Employee Terms",
}

export default function TermsOfServicePage() {
  return (
    <div className="overflow-auto">
      <div className="container mx-auto p-4 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Specific Terms of Use for Authorized Application Users </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h3>Purpose and Scope</h3>
          <p>
            These terms apply to authorized application users including Org Admins, Sales Reps, WFC Admin users, WFC
            personnel, independent sales representatives, and any other authorized users acting on behalf of an
            organization or WFC in connection with a fundraiser. By accessing or using the application, each user
            acknowledges and agrees that Participant Information may be accessed, viewed, used, or managed only as
            permitted in the application and only for legitimate fundraiser-related purposes.
          </p>

          <h3>Permitted Use of Participant Information</h3>
          <p>
            Authorized users may use Participant Information solely to support, administer, troubleshoot, reconcile,
            report on, and help manage the applicable fundraiser. Participant Information may not be used for unrelated
            business purposes, marketing, personal use, solicitation, profiling, or any purpose outside the operation
            and support of the fundraiser.
          </p>

          <h3>Confidentiality and Data Protection</h3>
          <p>
            Authorized users must treat all Participant Information as confidential and must protect it from
            unauthorized access, use, disclosure, copying, downloading, sharing, or retention. Users may access only the
            information reasonably necessary to perform their fundraiser-related responsibilities and must comply with
            all applicable WFC policies, confidentiality obligations, privacy requirements, and legal requirements.
          </p>

          <h3>Access Limitations</h3>
          <p>
            Participant names and related Participant Information are redacted by default for WFC Personnel unless
            temporary access has been enabled by an authorized Org Admin for the applicable fundraiser. Access may be
            used only during the applicable access period and only while the fundraiser is eligible for support access
            under the application&apos;s rules. Users must not attempt to bypass redaction, access restrictions,
            permissions, or other privacy controls.
          </p>

          <h3>Org Admin Authorization</h3>
          <p>
            Org Admins who enable temporary access represent that they are authorized to act on behalf of their
            organization and to permit WFC Personnel to access Participant Information for fundraiser-support purposes.
            Org Admins are responsible for granting access only when needed, reviewing the scope of access, and revoking
            access when it is no longer necessary.
          </p>

          <h3>Prohibited Disclosure and Sharing</h3>
          <p>
            Authorized users must not disclose, share, sell, transfer, publish, or otherwise make Participant
            Information available to any unauthorized person or third party. Participant Information may be shared
            internally only with authorized users who have a legitimate need to know for the purpose of supporting,
            administering, troubleshooting, or helping manage the applicable fundraiser.
          </p>

          <h3>Downloaded Reports and Exported Information</h3>
          <p>
            If a user downloads or exports a report containing Participant Information, the user remains responsible for
            protecting that information after it leaves the application. Downloaded or exported information must be used
            only for the applicable fundraiser-related purpose, stored securely, shared only with authorized
            individuals, and deleted or disposed of when no longer needed, subject to applicable WFC policies,
            organization requirements, and legal obligations.
          </p>

          <h3>No Broader Authority</h3>
          <p>
            Access to Participant Information does not make WFC, WFC Personnel, Sales Reps, or WFC Admin users a school
            official, representative of the organization, or decision-maker for the organization. Access is provided
            only to support WFC&apos;s role in helping administer and manage the fundraiser.
          </p>

          <h3>User Responsibility and Violations</h3>
          <p>
            Each authorized user is responsible for using the application and Participant Information in accordance with
            these terms. Misuse of Participant Information, unauthorized access, unauthorized disclosure, or violation
            of these terms may result in suspension or termination of access, internal disciplinary action, contractual
            remedies, and any other action available under applicable law or policy.
          </p>

          <h3>Acknowledgment and Consent</h3>
          <p>
            By logging into or using the application, each authorized user acknowledges that they have read, understood,
            and agree to these terms. Each user further agrees to access and use Participant Information only as
            permitted, to maintain the confidentiality and security of such information, and to comply with all
            applicable privacy, confidentiality, and fundraiser-related obligations.
          </p>
        </div>
      </div>
    </div>
  )
}
