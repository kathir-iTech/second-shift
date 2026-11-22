# Test Second Shift

**[Open the interactive public example](https://kathir-itech.github.io/second-shift/)** for the archive workflow. A Jira installation is required to replay your own tickets.

### Review the archive

1. Open **Public archive**. The default view highlights 17 cases that a current-field review would miss. Open the first ticket and compare its urgency at the first and last observations.
2. Save **High** as the expected priority and add a reason. The proposed **Moderate** result fails this case.
3. Select **Edit this policy cell**. Set the proposal to **High**. Under **Saved test cases**, verify that the case passes. **Restore example proposal** restores the original example change while retaining saved expectations.
4. Choose a different matrix cell or ticket. The queue and counts update from the underlying archive. **How to review** is available at any time.

### Review a Jira project

A Jira site administrator installs the app. Open a project and select **Second Shift** from its project navigation. If prompted, grant access with your own Atlassian account. The archive example also works inside the installed app without project configuration.

For live data choose **Jira project**. Select the impact and urgency single-value fields and the workflow status your team uses for triage. Load the tickets, open **Policy matrix**, and enter the reference and proposed priorities for the combination you want to test. Select **All cases** to inspect the result. Only the latest 25 visible issues are loaded. A ticket without a recorded transition to the chosen status appears as unknown.

For a controlled check on your own test site, create an incident with both fields set, transition it to your chosen status, and edit its impact afterward. Reload. The case must show the value at the transition and the different later value. To check a pre-existing priority discrepancy, use a baseline that differs from the recorded priority. Review changes affect the simulation only.

**Category:** Apps for Business Teams. Technology: Atlassian Forge Custom UI, Jira project page, Jira Cloud REST APIs in the user's permission context, and Forge KVS. No external paid service or model key is required.

