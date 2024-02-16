
FROM public.ecr.aws/docker/library/python:3.12
USER root
WORKDIR /srv
COPY . /srv

# Install Chrome Driver
ARG CHROME_URL="https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/119.0.6045.159/linux64/chromedriver-linux64.zip"
RUN wget -N ${CHROME_URL} -P ~/
RUN unzip ~/chromedriver-linux64.zip -d ~/
RUN rm ~/chromedriver-linux64.zip
RUN ln -fs ~/chromedriver /usr/local/bin/chromedriver
RUN ls -al /usr/local/bin/chromedriver

# Install Chrome Browser
RUN curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list
RUN apt-get -y update
RUN apt-get -y install google-chrome-stable
USER root

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
ENTRYPOINT [ "python3","scribe.py" ]
CMD ["1111111111", "123456789" ]
