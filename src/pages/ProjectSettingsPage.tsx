import { ProjectLayout } from "@/components/ProjectLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";
import { Database, Loader2, Shield, User } from "lucide-react";
import { useState } from "react";

const ProjectSettingsPage = () => {
  const { projectId } = useProject();
  const [loading, setLoading] = useState(false);
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("test");
  const [confirmPassword, setConfirmPassword] = useState("test");

  const handleCreateSuperuser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Password Mismatch", {
        description: "Passwords do not match. Please check and try again.",
      });
      return;
    }

    if (!email || !password) {
      toast.error("Missing Information", {
        description: "Please provide both email and password.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/openbase/projects/${projectId}/settings/create-superuser/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      toast.success("Success!", {
        description: data.message || "Superuser created successfully.",
      });

      // Reset form
      setEmail("test@example.com");
      setPassword("test");
      setConfirmPassword("test");
    } catch (error) {
      console.error("Failed to create superuser:", error);
      toast.error("Error", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to create superuser. Please check the server connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    setMigrateLoading(true);

    try {
      const response = await fetch(
        `/api/openbase/projects/${projectId}/manage/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            command: "migrate",
            args: [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        toast.success("Migration Complete!", {
          description: "Database migrations completed successfully.",
        });
      } else {
        throw new Error(data.stderr || "Migration failed");
      }
    } catch (error) {
      console.error("Failed to run migrations:", error);
      toast.error("Migration Error", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to run migrations. Please check the server connection.",
      });
    } finally {
      setMigrateLoading(false);
    }
  };

  return (
    <ProjectLayout selectedSection="settings" pageTitle="Project Settings">
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Django Superuser Management</CardTitle>
            </div>
            <CardDescription>
              Create a Django superuser account to access the Django admin
              interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSuperuser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                />
              </div>

              {/* Show default values info only when form is unchanged */}
              {email === "test@example.com" &&
                password === "test" &&
                confirmPassword === "test" && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm font-medium mb-2 text-yellow-800">
                      Default Test Credentials
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-yellow-800">
                          Email:
                        </span>
                        <span className="text-yellow-700 ml-2">
                          test@example.com
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-yellow-800">
                          Password:
                        </span>
                        <span className="text-yellow-700 ml-2">test</span>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">
                      These are pre-filled default credentials for testing.
                      Change them if needed for your development environment.
                    </p>
                  </div>
                )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Superuser...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Create Superuser
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Database Migrations</CardTitle>
            </div>
            <CardDescription>
              Run Django database migrations to apply schema changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                This will run{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  python manage.py migrate
                </code>{" "}
                to apply all pending migrations to your database.
              </p>
            </div>

            <Button
              onClick={handleMigrate}
              disabled={migrateLoading}
              className="w-full"
            >
              {migrateLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Migrations...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Run All Migrations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProjectLayout>
  );
};

export { ProjectSettingsPage };
