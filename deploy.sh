#!/bin/bash
export PROJECT_ID=$1;
export TEMPLATE_VERSION=$2;

echo $PROJECT_ID;

#gcloud builds submit --project=$PROJECT_ID --tag gcr.io/$PROJECT_ID/ms-files:$TEMPLATE_VERSION
cat k8s-manifests/deployment.yaml | sed -e "s/{PROJECT_ID}/${PROJECT_ID}/g;" | sed -e "s/{TEMPLATE_VERSION}/${TEMPLATE_VERSION}/g;" | sed -e "s/{REPLICAS}/${REPLICAS}/g;"   > deployment_version.yaml;
cat deployment_version.yaml;

gcloud container clusters get-credentials bet-alfa-cluster --region us-central1 --project $PROJECT_ID
kubectl apply -f deployment_version.yaml;
kubectl apply -f k8s-manifests/service.yaml;
kubectl apply -f k8s-manifests/ingress.yaml;

