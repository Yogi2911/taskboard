// Declarative pipeline for Taskboard.
// Requires in Jenkins:
// 1. NodeJS plugin with a tool named "node22"
// 2. Docker installed on the Jenkins agent

// Run a command on Linux/macOS (sh) or Windows (bat) agents
def run(String cmd) {
    if (isUnix()) {
        sh cmd
    } else {
        bat cmd
    }
}

pipeline {
    agent any

    tools {
        nodejs 'node22'
    }

    options {
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
    }

    parameters {
        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Build the Docker image and restart the container'
        )
    }

    triggers {
        // Run the complete pipeline approximately every 5 minutes
        cron('H/5 * * * *')
    }

    environment {
        IMAGE = 'taskboard'
        PORT  = '3000'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                script {
                    run 'npm ci'
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    run 'npm test'
                }
            }
        }

        stage('Build image') {
            when {
                expression {
                    params.DEPLOY
                }
            }

            steps {
                script {
                    run "docker build -t ${IMAGE}:${BUILD_NUMBER} -t ${IMAGE}:latest ."
                }
            }
        }

        stage('Deploy') {
            when {
                expression {
                    params.DEPLOY
                }
            }

            steps {
                script {

                    // Remove the previous container if it exists
                    try {
                        run "docker rm -f ${IMAGE}"
                    } catch (err) {
                        echo 'No previous container found. Continuing...'
                    }

                    // Start the new container
                    run "docker run -d --name ${IMAGE} -p ${PORT}:3000 -v taskboard-data:/data --restart unless-stopped ${IMAGE}:latest"
                }
            }
        }
    }

    post {

        success {
            echo "=========================================="
            echo "Taskboard pipeline completed successfully"
            echo "Build: #${BUILD_NUMBER}"
            echo "Application: http://localhost:${PORT}"
            echo "=========================================="
        }

        failure {
            echo "=========================================="
            echo "Taskboard pipeline FAILED"
            echo "Check the stage logs above."
            echo "=========================================="
        }
    }
}