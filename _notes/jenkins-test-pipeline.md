---
title: "Jenkins Test Pipeline"
layout: post
tags: Testing
---

## End goal:

Reduce test time from 65 minutes to 15 minutes.

## Problem:

The entire GST product was a monolithic java maven project with about 20 modules and 1000s of test cases, hence the time taken for running test cases was 65+ minutes, which hampered the productivity and deployment time.

Being in the core GST backend team (Ultron was the POD name), I picked up the task to reduce the test time.

## Current situation:

Test cases were executed in an M4 large EC2 machine with a TeamCity agent to get test coverage reports.

## TeamCity was primarily used for:

- Relative code coverage thresholds based on a base branch.
- Code coverage reports.
- Ease of integration.
- Low cost ($300 for an agent).

## Requirements:

- Parallelise – running test cases.
- Reduce cost (With parallelization, each TeamCity agent would cost 300$ more and require a standalone EC2 server).
- Support relative code coverage threshold based on different base reference branches (Code coverage threshold of a branch is compared with the code coverage of the branch raised against, which is not supported in Teamcity).
- Integration with Github and spinnaker pipeline for deployments.

## Implementation:

- Test cases were distributed across several test suites.
Further (Run test cases for smaller modules in the project), to include/ exclude modules, inputFiles.lst (list of test class names) was used, refer the python script below:

```
import os
import re
import argparse


def includeExcludeTest(args):
    exclude = testSelection(args, False)
    include = testSelection(args, True)

    if exclude is not None and include is not None:
        test_string = exclude + "," + include
    elif exclude is not None and include is None:
        test_string = exclude
    elif include is not None and exclude is None:
        test_string = include
    command = "mvn clean verify -Dtest='" + test_string + "' -DfailIfNoTests=false -Dmaven.wagon.http.pool=false"
    print(command)
    os.system(command)


def testSelection(args, param):
    modules = args.exclude
    test_string = "!"
    suffix = ",!"
    remove_suffix = 2

    if param:
        modules = args.include
        test_string = ""
        suffix = ","
        remove_suffix = 1

    if modules is not None:
        for module in modules:
            input_test_files = open(
                module + "/target/maven-status/maven-compiler-plugin/testCompile/default-testCompile/inputFiles.lst")
            for eachLine in iter(input_test_files):
                regex = module + "/src/test/java/in/cleartax/gst/"
                if re.search(regex, eachLine):
                    each_test = eachLine[(eachLine.find(regex) + (31 + len(module))): -1]
                    test_string = test_string + each_test + suffix

        test_string = test_string[:-remove_suffix]
        return test_string


def setup_args(parser):
    parser.add_argument(
        "--include",
        nargs="*",
        type=str
    )
    parser.add_argument(
        "--exclude",
        nargs="*",
        type=str
    )


def main():
    parser = argparse.ArgumentParser()
    setup_args(parser)
    args = parser.parse_args()
    includeExcludeTest(args)


if __name__ == "__main__":
    main()
```

### Usage:

- `python3 maven_test.py –exclude module1 module2`
- `python3 maven_test.py –include module1 module2`


### Just an example of how the pipeline looks like.
- Creating Jenkins pipeline

## Pipeline:

- Git pull (As the name suggests, get the latest changes of the source branch)
- Check for the label run-ci, this was primarily added to prevent unnecessary executions of test cases and are only executed when the developer adds the label run-ci to the pull-request.
- Build the project and push the image to docker registry, to prevent re-building the project for each parallel execution, thereby saving time.
- Run all the test suites/ group of test cases in parallel, in this case, there were 15 parallel executions.
- For cost reduction, AWS Spot instances were used.
- Upload the jacoco executable (Code coverage results) to AWS S3 (<BRANCH_NAME>_<BUILD_ID>).
- Consolidate code coverage reports, once all the executions are complete, code coverage report had to be consolidated to get the code coverage of all modules.
- Code coverage threshold validation, a similar pipeline runs to compute the code coverage of known base branches (stage, pre-production, and production) which is triggered every time a pull-request is merged.
- Disk clean up, all the files are deleted from the machine and picks up the next execution.
- View code coverage and surefire (Passed and failed test cases) results, user can view the code coverage per Jenkins job build, powered by jacoco-jenkins plugin.

## Jenkins pipeline example (jenkinsFile):

```
timeout(time: 60, unit: 'MINUTES') {
   def commands
   def imageDetails
   def imageName
   def uniqueName
   def buildCommand
   def gitUrl = 'git@github.com:PROJECT.git'
   def gitBranch = env.BRANCH_NAME
   def gitCredentialsId = 'XXXX-XXXX-XXXX'
   def lineCoverageJacoco
   def methodCoverageJacoco
   def classCoverageJacoco
   def branchBuildBumber
   def branchBuildName
   def pullNumber
   def githubUserToken = 'USERNAME:XXXX-XXXX-XXXX'
   def githubHeader = 'application/vnd.github.symmetra-preview+json'

   node(label : 'temp_docker_node') {

       stage('Git pull') {
           git branch: gitBranch,
           credentialsId: gitCredentialsId,
           url: gitUrl

           try {
               COMMIT_SHA = sh (script: 'git log -n 1 | grep -o -E -e "[0-9a-f]{40}"', returnStdout: true).trim()
               echo "Commit ID is ${COMMIT_SHA}"

               def labelResponse = sh(script: 'curl -u ' + githubUserToken + ' -H Accept:' + githubHeader + ' https://api.github.com/search/issues?q=SHA:' + COMMIT_SHA, returnStdout: true)
               def labelJson = readJSON text: labelResponse
               def labelList = labelJson.items[0].labels
               pullNumber = labelJson.items[0].number

               int labelCount = 0
               int labelFound = 0
               def sleepTime = 2

               while(labelCount < labelList.size()) {
                   if (labelList[labelCount].name == 'run-ci') {
                       labelFound = 1
                       echo "This PR is eligible for running parallel tests with label : ${labelList[labelCount].name}"
                   }
                   labelCount = labelCount + 1

                   echo "Sleeping for ${sleepTime} seconds to prevent rate limiting"
                   sleep(time:sleepTime, unit:"SECONDS")
               }
               if (labelFound != 1) {
                   error("LabelMismatchException")
               }
           }
           catch (e) {
               if (e.toString().contains("LabelMismatchException")) {
                   error("Add label [run-ci] to this PR to run parallel tests")
               }
               println e
           }
       }

       def jenkins_config = readJSON file: 'jenkins_config';
       commands = jenkins_config.testsToRun

       imageDetails = jenkins_config.imageDetails
       buildDetails = jenkins_config.buildDetails

       branchBuildBumber = "${currentBuild.id}"
       branchBuildName = "${env.BRANCH_NAME}"

       echo branchBuildBumber
       echo branchBuildName

       uniqueName = "${env.BRANCH_NAME}_${currentBuild.id}".replace("/", "_").replace("#", "_")
       imageName = "${imageDetails.imageName}:" + uniqueName
       buildCommand = "mvn -T 1C clean package -DskipTests=true"
       stage('Build') {
           sh 'rm -rf coverage'
           sh buildCommand
       }
       stage ('Push image') {
           retry (2) {
               docker.withRegistry('https://XXXX.amazonaws.com', 'ecr:REGION:AWS Spot Role') {
               def customImage = docker.build(imageName)
               customImage.push()
               }
           }
       }
   }
   tests = [:]
   int com = 0

   while(com < commands.size() ){
       String testName = "tests_${com}"
       String s3UploadCommand = "aws s3 cp \$WORKSPACE/<PATH>/target/coverage-report/merged.exec s3://<AWS-S3>/" + uniqueName + "/" + testName + ".exec"
       String commandToRun = commands[com] + " && rm -rf  \$WORKSPACE/coverage && cp -r ./  \$WORKSPACE/coverage"

       try {
           tests[testName] = {
               node(label : 'temp_docker_node') {
                       try {
                           stage (testName){
                               docker.withRegistry('https://XXXX.amazonaws.com', 'ecr:REGION:AWS Spot Role') {
                                   docker.image(imageName).inside('-v $HOME/.m2:/home/jenkins/.m2'){
                                   sh commandToRun
                                   }
                               }
                           }
                           try {
                               sh s3UploadCommand
                           }
                           catch (e) {
                               echo "Check for test failures in prior maven test step"
                               sh 'sudo pip3 install awscli --force-reinstall --upgrade'
                               sh s3UploadCommand
                           }
                       }
                       catch (e) {
                           error("There are few test failures, check the [Tests] tab or maven verify step")
                           println e
                       }
                       finally {
                           try {
                               junit '**/surefire-reports/*.xml'
                           }
                           catch (e) {
                               error("No test report files were found, check the [Tests] tab or maven verify step")
                               println e
                           }
                       }
                   }
               }
           }
       catch (e) {
           println e
       }
       com = com + 1
   }

  parallel tests
  node(label : 'temp_docker_node') {
       String s3DownloadCommand = "mkdir -p /usr/src/app/<PATH>/target/suite-reports && aws s3 cp s3://<AWS-S3>/" + uniqueName + "/" + " /usr/src/app/<PATH>/target/suite-reports --recursive"

       stage ('coverage') {
           docker.withRegistry('https://XXXX.amazonaws.com', 'ecr:REGION:AWS Spot Role') {
               docker.image(imageName).inside('-v $HOME/.m2:/home/jenkins/.m2'){
                   sh s3DownloadCommand
                   sh 'cd /usr/src/app/<PROJECT-PATH> && mvn antrun:run@finalTask -P final-report &&  rm -rf  \$WORKSPACE/coverage && cp -r /usr/src/app/  \$WORKSPACE/coverage'
               }
           }
       }

       echo "Running coverage for branch ${env.BRANCH_NAME} with build number ${currentBuild.id}"

       jacoco(
             execPattern: '**/coverage/<PATH>/target/coverage-report/final.exec',
             classPattern: '**/coverage/**',
             sourcePattern: '**/coverage/**',
             inclusionPattern: '**/*.class',
             exclusionPattern: '**/*Test*.class'
       )

       stage('Threshold') {
           String baseRefBranch
           String jenkinsJobName

           try {
               retry (2) {
                   def pullResponse = sh(script: 'curl -u ' + githubUserToken + ' -H Accept:' + githubHeader + ' https://api.github.com/repos/<REPO-NAME>/pulls/' + pullNumber, returnStdout: true)
                   def pullJson = readJSON text: pullResponse
                   baseRefBranch = pullJson.base.ref

                   if (!baseRefBranch.contains("release")) {
                       baseRefBranch = "master"
                   }
               }
           } catch (e) {
               baseRefBranch = "master"
           }

           echo "Created from branch is ${baseRefBranch}"

           if (baseRefBranch == "master") {
               jenkinsJobName = "masterParallelTest"
           }
           else if (baseRefBranch == "production-release") {
               jenkinsJobName = "productionParallelTest"
           }
           else {
               jenkinsJobName = "releaseParallelTest"
           }

           def codeCoverageResponse = sh(script: 'curl http://jenkins.<CUSTOM>.co/job/' + jenkinsJobName + '/lastSuccessfulBuild/jacoco/api/json?pretty=true --user "EMAIL:TOKEN"', returnStdout: true)
           def codeCoverageResponseJson = readJSON text: codeCoverageResponse
           branchBuildName = branchBuildName.replace("/", "%2F").replace("#", "%23")

           def branchResponse = sh(script: 'curl http://jenkins.<CUSTOM>.co/job/ParallelTest/job/' + branchBuildName + '/' + branchBuildBumber + '/jacoco/api/json?pretty=true --user "EMAIL:TOKEN"', returnStdout: true)
           def branchJson = readJSON text: branchResponse

           echo "Line coverage of master : ${codeCoverageResponseJson.lineCoverage.percentageFloat} and current value is ${branchJson.lineCoverage.percentageFloat}"
           echo "Class coverage of master : ${codeCoverageResponseJson.classCoverage.percentageFloat} and current value is ${branchJson.classCoverage.percentageFloat}"
           echo "Method coverage of master : ${codeCoverageResponseJson.methodCoverage.percentageFloat} and current value is ${branchJson.methodCoverage.percentageFloat}"

           float currentLineCoverage = "${branchJson.lineCoverage.percentageFloat}"
           float currentMethodCoverage = "${branchJson.methodCoverage.percentageFloat}"
           float currentClassCoverage = "${branchJson.classCoverage.percentageFloat}"

           float baseBranchLineCoverage = "${codeCoverageResponseJson.lineCoverage.percentageFloat}"
           float baseBranchMethodCoverage = "${codeCoverageResponseJson.methodCoverage.percentageFloat}"
           float baseBranchClassCoverage = "${codeCoverageResponseJson.classCoverage.percentageFloat}"

           baseBranchLineCoverage = baseBranchLineCoverage - 0.3
           baseBranchMethodCoverage = baseBranchMethodCoverage - 0.2
           baseBranchClassCoverage = baseBranchClassCoverage - 0.2

           echo "Line coverage threshold : ${baseBranchLineCoverage} | Class coverage threshold : ${baseBranchClassCoverage} | Method coverage threshold : ${baseBranchMethodCoverage}"

           if (currentLineCoverage < baseBranchLineCoverage) {
               error("Line coverage is low")
           }
           else {
               echo "Line coverage passed"
           }

           if (currentClassCoverage < baseBranchClassCoverage) {
               error("Class coverage is low")
           }
           else {
               echo "Class coverage passed"
           }

           if (currentMethodCoverage < baseBranchMethodCoverage) {
               error("Method coverage is low")
           }
           else {
               echo "Method coverage passed"
           }
       }

       stage('Disk clean up') {
           try {
               echo "Cleaning the disk"
               sh 'docker system prune --volumes -f'
               sh 'docker image prune -a -f'
           }
           catch (e) {
               echo "Clean failed as it is already in progress"
           }
       }
   }
}
```

Example of defining the number of parallel executions : testsToRun – List of commands.

```
{
	"buildDetails" = {
		"buildCommand" = "mvn -T 1C clean package -DskipTests=true"
	},

	"imageDetails" = {
		"imageName" = "<IMAGE-NAME>"
	},

	"testsToRun" = [
		"cd /usr/src/app &&  mvn verify -Dtest=TestSuite1 -DfailIfNoTests=false -Dmaven.wagon.http.pool=false",
		"cd /usr/src/app &&  mvn verify -Dtest=TestSuite2 -DfailIfNoTests=false -Dmaven.wagon.http.pool=false",
		"cd /usr/src/app &&  mvn verify -Dtest=TestSuite3 -DfailIfNoTests=false -Dmaven.wagon.http.pool=false",
		"cd /usr/src/app &&  mvn verify -Dtest=TestSuite4 -DfailIfNoTests=false -Dmaven.wagon.http.pool=false",
		"cd /usr/src/app &&  mvn verify -Dtest=TestSuite5 -DfailIfNoTests=false -Dmaven.wagon.http.pool=false",
		"cd /usr/src/app &&  mvn verify -Dtest=TestSuite6 -DfailIfNoTests=false -Dmaven.wagon.http.pool=false",
		"cd /usr/src/app &&  mvn verify -Dtest=TestSuite7 -DfailIfNoTests=false -Dmaven.wagon.http.pool=false",
        "cd /usr/src/app &&  mvn verify -Dtest=UnitTestSuite -DfailIfNoTests=false -Dmaven.wagon.http.pool=false",
        "cd /usr/src/app &&  python3 maven_test.py --exclude module1 module2",
        "cd /usr/src/app &&  python3 maven_test.py --include module3 module4"
	]
}
```

Ant scripts were used to generate code coverage reports for each execution and merge all the individual code coverage reports stored in AWS S3.

```
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <artifactId>ARTIFACT</artifactId>
        <groupId>GROUP_ID</groupId>
        <version>1.0-SNAPSHOT</version>
    </parent>
    <modelVersion>1.0.0</modelVersion>

    <artifactId>COVERAGE_MODULE</artifactId>

    <properties>
        <skip.final.report>true</skip.final.report>
        <build.directory.suite-reports>../project-coverage/target/suite-reports</build.directory.suite-reports>
        <!--All modules having test cases should be added here-->
        <!--Directories-->
        <build.directory.module1>../module1/target</build.directory.module1>
        <build.directory.module2>../module2/target</build.directory.module2>
        <build.directory.module3>../module3/target</build.directory.module3>
        <build.directory.module4>../module4/target</build.directory.module4>
        <build.directory.module5>../module5/target</build.directory.module5>
        <build.directory.module6>../module6/target</build.directory.module6>
        <build.directory.module6>../module6/target</build.directory.module6>
    </properties>

    <profiles>
        <profile>
            <id>final-report</id>
            <properties>
                <skip.final.report>false</skip.final.report>
            </properties>
        </profile>
    </profiles>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-dependency-plugin</artifactId>
                <executions>
                    <!-- Copy the ant tasks jar | Needed for ts.jacoco.report-ant -->
                    <execution>
                        <id>jacoco-dependency-ant</id>
                        <goals>
                            <goal>copy</goal>
                        </goals>
                        <phase>process-test-resources</phase>
                        <inherited>false</inherited>
                        <configuration>
                            <artifactItems>
                                <artifactItem>
                                    <groupId>org.jacoco</groupId>
                                    <artifactId>org.jacoco.ant</artifactId>
                                    <version>0.7.9</version>
                                </artifactItem>
                            </artifactItems>
                            <stripVersion>true</stripVersion>
                            <outputDirectory>${basedir}/target/jacoco-jars</outputDirectory>
                        </configuration>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-antrun-plugin</artifactId>
                <version>1.8</version>
                <executions>
                    <execution>
                        <!--merge jacoco.exec for all modules to merged.exec-->
                        <id>mergeTask</id>
                        <phase>post-integration-test</phase>
                        <goals>
                            <goal>run</goal>
                        </goals>
                        <configuration>
                            <target>
                                <echo message="Merging JaCoCo Reports" />
                                <taskdef name="merge" classname="org.jacoco.ant.MergeTask">
                                    <classpath path="${project.basedir}/target/jacoco-jars/org.jacoco.ant.jar" />
                                </taskdef>
                                <mkdir dir="${project.basedir}/target/coverage-report" />
                                <merge destfile="${project.basedir}/target/coverage-report/merged.exec">
                                    <fileset dir="${build.directory.module1}"><include name="jacoco.exec" /></fileset>
                                    <fileset dir="${build.directory.module2}"><include name="jacoco.exec" /></fileset>
                                    <fileset dir="${build.directory.module3}"><include name="jacoco.exec" /></fileset>
                                    <fileset dir="${build.directory.module4}"><include name="jacoco.exec" /></fileset>
                                    <fileset dir="${build.directory.module5}"><include name="jacoco.exec" /></fileset>
                                    <fileset dir="${build.directory.module6}"><include name="jacoco.exec" /></fileset>
                                </merge>
                            </target>
                        </configuration>
                    </execution>

                    <execution>
                        <id>finalTask</id>
                        <phase>verify</phase>
                        <goals>
                            <goal>run</goal>
                        </goals>
                        <configuration>
                            <skip>${skip.final.report}</skip>
                            <target>
                                <echo message="Generating final executable" />
                                <taskdef name="final" classname="org.jacoco.ant.MergeTask">
                                    <classpath path="${project.basedir}/target/jacoco-jars/org.jacoco.ant.jar" />
                                </taskdef>
                                <final destfile="${project.basedir}/target/coverage-report/final.exec">
                                    <fileset dir="${build.directory.suite-reports}"><include name="*.exec" /></fileset>
                                </final>
                            </target>
                        </configuration>
                    </execution>

                </executions>

                <dependencies>
                    <dependency>
                        <groupId>org.jacoco</groupId>
                        <artifactId>org.jacoco.ant</artifactId>
                        <version>0.7.9</version>
                    </dependency>
                </dependencies>
            </plugin>

        </plugins>
    </build>

</project>
```

More detailed explanation for generating code coverage report for a multi-module maven project can be found here

All of the above steps cover the code pieces, however, that constitutes to about 40% of the work, a lot more effort put in for:

- Jenkins integration with AWS EC2 auto-scaling (Based on disk space and number of instances in the spot fleet).
- Ensure a new instance picks up the same task when an instance is killed abruptly (Spot instances are not stand-alone, hence cheaper).

About 2 minutes before the instance is killed, a file is uploaded to a defined path by AWS to signal that the instance will be killed soon.

```
@Slf4j
public class SpotTerminationHealthCheck extends HealthCheck {

    private static String TERMINATION_FILE = "/tmp/spot-shutdown-notice";

    @Override
    protected Result check() {
        if (new File(TERMINATION_FILE).exists()) {
            final String message = String.format("Spot Instance termination notice received: %s is present." +
                            " Marking this node unhealthy",
                    TERMINATION_FILE);

            log.warn(message);

            return Result.unhealthy(message);
        }
        return Result.healthy("Spot Instance still active.");
    }
}
```

- Pipeline setup and expose APIs (this was powered by a flask application with AWS S3 as the storage hosted in a T2 small EC2 instance) for code coverage of the base branches used for defining the threshold.
- Setting up docker. We eventually started using docker for deployments as we migrated to Kubernetes and an easy environment set-up for new joiners.
- Fixing Jenkins jacoco plugin.
- The parallel test framework was generic and could be used with any maven project.

## Conclusion:

Test time was reduced to 14 minutes – best case, 17 minutes – average, and 22 minutes being the worst case and cost about 20$ – 25$ per week.
