# Use an official Nginx image
FROM nginx:alpine

# Set the working directory
WORKDIR /usr/share/nginx/html

# Remove the default Nginx static content
RUN rm -rf ./*

# Copy the frontend files into the container
COPY app /usr/share/nginx/html

# Expose port 80 to serve the application
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
