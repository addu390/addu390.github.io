---
layout: post
title: "SHAP: Shapley Additive Explanations"
date: 2022-07-05
tags:
  - System Design
  - Machine Learning
author: Adesh Nalpet Adimurthy
feature: assets/featured/reinvent-the-wheel.png
category: System Wisdom
---

<img class="center-image" src="./assets/featured/reinvent-the-wheel.png" /> 
<p style="text-align: center;">Reinvent the Wheel! </p>

## Interpretability of AI

Over the past years, there has been and always will be in active development in Artificial intelligence. Where inclusion of AI in our everyday lives has become a norm, most businesses directly or indirectly revolve around artificial intelligence models. More importantly, the easy abstraction to build AI models takes only a few lines of code to implement nearly production-ready AI models. All of this translates into the need to better interpret the predictions the AI models make. SHAP (Shapley Additive Explanations) exists for this reason: for the interpretability of artificial intelligence models.

## Surrogate models

Surrogate models use a machine learning model as a black box by tweaking the inputs slightly to test the corresponding changes in the prediction--important to ensure that these tweaks are close to the original data point. For example, consider four features, `F1`, `F2`, `F3`, and `F4`; if tweaking `F1` leads to a drastic change in the model prediction as compared to `F4`, it's evident that `F1` is an important predictor as compared to `F4`. Since the surrogate models treat the ML model as a black box, it is model agnostic. Furthermore, the surrogate models need not be very specific to the global model (black box). Here the goal is to understand the reason behind the model making predictions by making variations to the data fed into the black-box model. 

## Local Interpretability

To better understand a specific prediction, when a data point is fed, LIME (Local Surrogate) generates a new dataset consisting of permuted samples and their corresponding predictions from the black-box model. Then, a local interpretable model is trained based on the newly generated dataset weighted by the proximity of the sampled instances to the instance of interest (data point). The local interpretable model is a simple model such as Linear Regression, Logistic Regression, Decision Trees, Naive Bayes, or K Nearest Neighbors. The new learned model is a good approximator of the local model predictions and may not be a good global approximator; this form of accuracy is known as Local Fidelity.

## Shapley values
Before getting into the details of how SHAP works, it's essential to know what Shapley values are.

A prediction can be explained by assuming that each feature value of the instance is a `player` in a game where the prediction is the payout. Shapley values – a method from coalitional game theory – tell us how to distribute the "payout" among the features fairly. Consider `N` players collectively obtaining a reward `P`, such that the reward is fairly distributed to each one of the `N` players based on their individual contribution; such a contribution is a Shapley value.

Simply put, a Shapley value is the average marginal contribution of an instance of a feature among all possible combinations of features.

For example, let's say there is a group of four friends, `A`, `B`, `C`, and `D`, working together to get a profit `P`. Now, the intention is to measure the contribution of every group member, i.e., to find the Shapley value of each member, we calculate the difference between the profit generated when the member is present and when the member is absent is calculated for all the possible subgroups or coalitions (marginal contribution). The mean of these differences/marginal contributions is the Shapley value.

The figure below shows the calculation of the marginal contribution for member `A` for the subgroup `A, B, C, D` with and without `A`.


<img class="center-image" src="./assets/posts/machine-learning/marginal-contribution-abcd.png" /> 
<p style="text-align: center;">Figure 1: Marginal Contribution of member "A" to the subgroup "A, B, C, D" | Image by Fernando López</p>

Similarly, to calculate the Shapley value of member `A`, find the marginal contribution for all collations/subgroups where member `A` appears, i.e., the difference between the profit when the member is present versus the profit when the member is absent, then calculate the mean of the marginal contributions to get the Shapley value. Figure 2 illustrates the calculation of the Shapley value of member `A`.

<img class="center-image" style="width: 100%" src="./assets/posts/machine-learning/marginal-contribution-all.jpeg" /> 

<img class="center-image" style="width: 80%" src="./assets/posts/machine-learning/marginal-contribution-mean.jpeg" /> 
<p style="text-align: center;">Figure 2: Shapley value calculation for member “A” | Image by Fernando López</p>

In the context of the machine learning model, group members represent features, and profit is the prediction by the ML model. However, most ML models have a large number of features where each feature is a discrete or continuous variable, making it computationally complex to calculate Shapley values for all features (for all subgroups).

## SHAP (SHapley Additive exPlanations)

SHAP (SHapley Additive exPlanations) by Lundberg and Lee (2017) is a method to explain individual predictions and how different features contribute to the prediction through Shapley Values. The basic idea behind SHAP is to calculate the Shapley values for each feature of the sample, where each Shapley value represents the impact that the feature with which it is associated.

However, as seen in the prior section, calculating the Shapley values for all the features for all the subgroups/collations is an NP-hard problem, to avoid that, the authors introduced Kernel Shap, an extended and improved method from [Linear Lime](https://arxiv.org/pdf/1602.04938.pdf) to calculate Shapley values.

### Kernel Shap

Kernel Shap is a method that allows the calculation of Shapley values with much fewer coalition samples/subgroups. Kernel Shap is based on a weighted linear regression where the coefficients of the solution are the Shapley values. In order to build the weighted linear model, `n` sample coalitions are taken; for each coalition, the prediction and the weight are calculated with the kernel SHAP. Finally, the weighted linear model is fit, and the resulting coefficients are the Shapley values.

<img class="center-image" style="width: 80%" src="./assets/posts/machine-learning/kernel-shap.png" /> 
<p style="text-align: center;">Equation 1: Kernel SHAP Equation | Image by Fernando López</p>

Consider instance `x`, with features `F1`, `F2`, `F3`, and `F4`. The procedure begins by taking a set of coalition samples. For example, the coalition `1, 0, 1, 0` refers to the presence of the features `F1` and `F3` and the absence of `F2` and `F4`. Since ML models cannot omit features to make inferences, the values of features `F2` and `F4` are replaced by values from the training set. Then, for coalition `1, 0, 1, 0`, values of `F1` and `F3` are taken from instance `x`, and the values of features `F2` and `F4` come from the training set; in this way, the prediction is made correctly. Hence, for each coalition sample, the prediction and weight are calculated with the kernel SHAP as shown in Equation 1; the resulting coefficients are the Shapley values.

<img class="center-image" style="width: 100%" src="./assets/posts/machine-learning/kernel-shap-calculation.jpeg" /> 
<p style="text-align: center;">Figure 3: Descriptive process of SHAP to obtain Shapley values from an ML model | Image by Fernando López</p>

Lastly, while there are several other methods to calculate Shapley values, Kernel SHAP is the only method that's model agnostic, i.e., Kernel SHAP can interpret any ML model. However, based on the ML model, there are other commonly used methods, such as Tree SHAP, Deep SHAP, Low-Order SHAP, Linear SHAP, and Max SHAP.



