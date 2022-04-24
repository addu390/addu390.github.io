---
title: "Work at Wrk"
layout: post
tags: Internship
---

Hey 👋 I'm a Computer Science graduate student looking for a <b>full-time internship in Backend Engineering from August 2022</b>. I previously worked as a Backend Engineer in Walmart's PhonePe and YC ClearTax. For a better representation of my skills and experiences, my resume: [pyblog.xyz/about](https://pyblog.xyz/about).

## 1. Five Reasons to hire me?

- Actions over words: after understanding Wrk as a black box as an outsider, I came up with a proposal to simplify integration with Wrk; Refer to the Sections <b>2.1 and 2.2</b>
- I have the <b>skill and experience</b> to work in fast-growth and high-scale environments. For instance, at PhonePe, handling a scale to serve over [370+ million](https://www.phonepe.com/pulse/explore/transaction/2021/4/) B2C and B2B users in the fintech space primarily meant automating the legacy processes, managing 1000s of servers, and working with over a dozen micro-services among the 300+
- I am open to working <b>anywhere in Canada</b> or remotely.
- While improving technical skills goes unsaid, I constantly work towards my <b>soft skills</b> (Certified in "Business Communications for Researchers" and recently completed the "Exploring Entrepreneurship - Mentorship Program").
- I'm a budding <b>open source contributor</b>; one of the most recent projects is "Building a World Cartogram" for "Our World in Data." The prototype: [population cartogram](https://www.pyblog.xyz/population-cartogram/).

## 2. The Proposal
### 2.1. Easy integration of Wrkflows with the existing workflows management tools.

After exploring a broad range of [wrk-actions](https://wrk.com/wrk-actions/) and given that the cloud infrastructure provider AWS, Azure, and Google Cloud has a market share of 33%, 22%, and 9%, respectively, let's take an example: 

Alex runs a tax filing business and uses [AWS](https://aws.amazon.com/) as the cloud provider; [AWS Step Functions](https://aws.amazon.com/step-functions) as the workflow orchestrator.

An existing workflow - collects the data and performs reconciliation between sales and purchase records. After the reconciliation, the top-3 action items are:
Reaching out to the supplier(s) for clarification/correction.
Consulting the Chartered Accountant to link/de-link invoices based on the match results.
Fixing the ITC (Input Tax Credits) claims.

Alex is well aware of several other similar use-cases and wants to offer better flexibility to the finance team to decide on the action items and is looking for products that can be easily integrated with the existing system. Not to mention, Alex's topmost priority is high confidentiality and security.

Jan is a Relationship Manager at Wrk who has been in talks with Alex and finally struck a deal! <b>How did they do it?</b>

- The client integrated with Wrk's [SQS](https://aws.amazon.com/sqs/) (Amazon Simple Queue Service) queue(s) within the AWS network using the [VPC endpoint](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html) ([AWS Private Link](https://docs.aws.amazon.com/vpc/latest/privatelink/integrated-services-vpce-list.html)), thereby reducing network bandwidth and offering higher security as the communication is within the private network.
- Wrk's consumer pool reads the messages in the queue and initiates the intended wrkflow(s).
- For Alex, any further integration with Wrk is as simple as a Drag and Drop in the Step functions console or, in a more general construct, use the Wrk's SQS as the trigger to start a pre-configured workflow.

Below is an illustration of the ease of integration in the AWS Console:

<img src="../assets/posts/aws-wrkflow.png" /> 
Note: 
- The "Wrk SQS" card is for illustration only, and in the real console, it would be an AWS SQS card.
- The assumption is that Wrk uses AWS for this scenario, but not necessarily a constraint.

Alex is more than happy to know that the finance team is in complete control to do what's best for the customers, while the engineering team dedicates their bandwidth to what makes them stand out, their proprietary reconciliation tool.

The above example is not limited to a cloud provider or a specific workflow management tool but rather an example of how integrating existing workflows with Wrk can be easy, secure, and fast.

### 2.2. Software Development Kit

Disclaimer: SDK(s) to manage wrkflows could be present already, but I could not find resources to affirm the same. 

To have better control over the different components and processes in a product, one of the must-have and go-to approaches is "as-code" (example: infrastructure as code), which translates to version control, review process, and ownership.

Let's take an example of [Claims & Request Processing](https://wrk.com/wrkflows/claims-and-request-processing/) in Java with an additional change to demonstrate parallel workflow:

```
WrkFlow wrkflow = SequentialWrkflow()
        .name("Claims & Request Processing")
        .execute(VerifyEligibility)
        .then(VerifyAmount)
        .then(ConditionalWrkflow()
                .execute(ClassifyExpense)
                .when(Predicate.APPROVED)
                .then(ParallelWrkflow()
                        .execute(EmailToFinance, EmailToEmployee)
                        .build())
                .otherwise(EmailToEmployee)
                .build())
        .build();
```

Where `VerifyEligibility`, `VerifyAmount`, `ClassifyExpense`, `EmailToFinance` and `EmailToEmployee` are activities/actions, the building block of a wrkflow, an activity by itself can be a wrkflow. These activities extend a predefined activity, which is one of the pre-configured wrk-actions. Furthermore, wrkflow definitions can be YML or JSON files instead of java objects.

## 3. Why work at Wrk?

Working in a company is a two-way street, the main reason why I want to work at Wrk:

<b>Addressing the right problem</b>: With more and more companies coming into the digital space and existing companies giving at most importance to customer experience, "automation" is the way to scale and solve. Every company out there has a workflow. The no-code/less-code approach to defining these workflow(s) so companies can work towards the betterment of the kernel of their product is the way forward for many.

That said, the need for constant innovation and skilling-up at Wrk goes unsaid. A checklist of Fast-growing, customer-first, remote-first - Wrk tops them all.

## 4. About me

- Resume: [pyblog.xyz/about](https://pyblog.xyz/about)
- Github: [@addu390](https://github.com/addu390)
- Blog: [pyblog.xyz](https://pyblog.xyz/)
- Medium: [pyblog.medium.com](https://pyblog.medium.com/)
- LinkedIn: [@adesh-nalpet-adimurthy](https://www.linkedin.com/in/adesh-nalpet-adimurthy/)
- Twitter: [@gooshi_addu](https://twitter.com/gooshi_addu)
- LinkTree: [thenextbigproject.com](http://thenextbigproject.com/)


