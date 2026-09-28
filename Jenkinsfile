// Declarative pipeline for Taskboard.
// Requires in Jenkins: "NodeJS" plugin with a tool named "node22" (Node 22.13+),
// and Docker installed on the agent (only needed for the Deploy stage).

// Run a command on Linux/macOS (sh) or Windows (bat) agents
def run(String cmd) {
  if (isUnix()) { sh cmd } else { bat cmd }
}

pipeline {
  agent any

  tools { nodejs 'node22' }

  options {
    timestamps()
    timeout(time: 15, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
    disableConcurrentBuilds()
  }

  parameters {
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Build the Docker image and (re)start the container')
  }

  triggers {
    // Cron: every night around 02:00 (H spreads load; Jenkins picks the exact minute)
    cron('H 5 * * * *')

  }

  environment {
    IMAGE = 'taskboard'
    PORT  = '3000'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps { script { run 'npm ci' } }
    }

    stage('Test') {
      steps { script { run 'npm test' } }
    }

    stage('Build image') {
      when { expression { params.DEPLOY } }
      steps {
        script { run "docker build -t ${IMAGE}:${BUILD_NUMBER} -t ${IMAGE}:latest ." }
      }
    }

    stage('Deploy') {
      when { expression { params.DEPLOY } }
      steps {
        script {
          // Stop the old container if it exists (ignore failure on first run)
          try { run "docker rm -f ${IMAGE}" } catch (err) { echo 'No previous container to remove' }
          run "docker run -d --name ${IMAGE} -p ${PORT}:3000 -v taskboard-data:/data --restart unless-stopped ${IMAGE}:latest"
        }
      }
    }
  }

  post {
    success { echo "Deployed build #${BUILD_NUMBER} at http://localhost:${PORT}" }
    failure { echo 'Build failed - check the stage logs above.' }
    // Add email/Slack notifications here, e.g. mail to: 'you@example.com', subject: "Build failed: ${JOB_NAME}"
  }
}
