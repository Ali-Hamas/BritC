from PIL import Image
import os

# Define file names
input_file = 'brisee-logo.png'
output_file = 'brisee-playstore-icon.png'

# Standard Play Store icon dimensions
target_width = 512
target_height = 512

# Check if input file exists in the current folder
if not os.path.exists(input_file):
    print(f"Error: The input file '{input_file}' was not found.")
    print("Please make sure your logo image is in the same directory as this script.")
else:
    try:
        # Open the original image
        with Image.open(input_file) as img:
            print(f"Original image size: {img.size}")
            
            # Use LANCZOS resampling for high-quality downscaling
            # This handles non-square input by direct resizing.
            resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
            
            # Save the new file as a PNG
            resized_img.save(output_file, format='PNG')
            
            print(f"\n✅ Successfully resized '{input_file}' to {target_width}x{target_height} pixels.")
            print(f"✅ The new file is saved as '{output_file}'.")
            print(f"ℹ️ You can now upload '{output_file}' to the Google Play Console.")

            # Optional: Check final file size
            file_size_kb = os.path.getsize(output_file) / 1024
            print(f"ℹ️ Output file size: {file_size_kb:.2f} KB (well under the 1 MB limit).")

    except Exception as e:
        print(f"❌ An error occurred: {e}")