FROM node:22-bookworm

RUN npm install -g appium@3.7.0

RUN appium driver install uiautomator2@8.5.0

EXPOSE 4723

CMD ["appium", "--address", "0.0.0.0", "--port", "4723"]
